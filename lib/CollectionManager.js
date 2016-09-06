import _bind from 'fast.js/function/bind';
import _each from 'fast.js/forEach';
import _map from 'fast.js/map';
import _keys from 'fast.js/object/keys';
const Collection = typeof window !== 'undefined' && window.Mars
  ? window.Mars.Collection : require('marsdb').Collection;


export function createCollectionDelegate(connection) {
  const _currentDelegateClass = Collection.defaultDelegate();

  /**
   * Collection manager is a factory for Mars.Collection
   * objects (one object by collection name).
   * It also syncing client/server changes.
   */
  class CollectionManager extends _currentDelegateClass {
    constructor(...args) {
      super(...args);
      connection.on('status:connected', _bind(this._handleConnected, this));
      connection.on('message:added', _bind(this._handleRemoteAdded, this));
      connection.on('message:changed', _bind(this._handleRemoteChanged, this));
      connection.on('message:removed', _bind(this._handleRemoteRemoved, this));

      // For ensure that collection is initialized
      process.nextTick(() => {
        if (connection.isConnected) {
          this._handleConnected(false);
        }
      });
    }

    /**
     * Calls remote method `/_collection_name_/insert`. It reverts back
     * optimistic update on server fail. It also have some options
     * to customize working approach:
     * `retryOnDisconnect` option retry method call if it was failed
     * 										 because dicsonnection. Default is true.
     * `waitResult` option disable optimistic update of the collection.
     * 							Returned Promise will be resolved when server returns
     * 							the result.
     * @param  {Object}  doc
     * @param  {Boolean} options.retryOnDisconnect
     * @param  {Boolean} options.waitResult
     * @param  {Object}  randomId
     * @return {Promise}
     */
    insert(doc, options = {}, randomId = {}) {
      let localInsert;
      const { quiet, retryOnDisconnect = true, waitResult } = options;

      if (!quiet) {
        const methodName = `/${this.db.modelName}/insert`;
        const applyOpts = {
          retryOnDisconnect: !!retryOnDisconnect,
          randomSeed: randomId.seed,
        };
        const result = connection.methodManager
          .apply(methodName, [doc], applyOpts);

        if (waitResult) {
          return result.then(() => doc._id);
        } else {
          result.then(null, (e) => {
            return localInsert
              .then(() => this.db.remove(doc._id, {quiet: true}))
              .then(() => {
                throw e;
              });
          });
        }
      }

      localInsert = super.insert(doc, options, randomId);
      return localInsert;
    }

    /**
     * Calls remote method `/_collection_name_/remove`. It reverts back
     * optimistic update on server fail. It also have some options
     * to customize working approach:
     * `retryOnDisconnect` option retry method call if it was failed
     * 										 because dicsonnection. Default is true.
     * `waitResult` option disable optimistic update of the collection.
     * 							Returned Promise will be resolved when server returns
     * 							the result.
     * @param  {Object}  doc
     * @param  {Boolean} options.retryOnDisconnect
     * @param  {Boolean} options.waitResult
     * @param  {Object}  randomId
     * @return {Promise}
     */
    remove(query, options = {}) {
      let localRemove;
      const { quiet, retryOnDisconnect = true, waitResult } = options;

      if (!quiet) {
        const methodName = `/${this.db.modelName}/remove`;
        const applyOpts = { retryOnDisconnect: !!retryOnDisconnect };
        const result = connection.methodManager
          .apply(methodName, [query], applyOpts);

        if (waitResult) {
          return result;
        } else {
          result.then(null, (e) => {
            return localRemove
              .then((remDocs) => this.db.insertAll(remDocs, {quiet: true}))
              .then(() => {
                throw e;
              });
          });
        }
      }

      localRemove = super.remove(query, options);
      return localRemove;
    }

    /**
     * Calls remote method `/_collection_name_/update`. It reverts back
     * optimistic update on server fail. It also have some options
     * to customize working approach:
     * `retryOnDisconnect` option retry method call if it was failed
     * 										 because dicsonnection. Default is true.
     * `waitResult` option disable optimistic update of the collection.
     * 							Returned Promise will be resolved when server returns
     * 							the result.
     * @param  {Object}  doc
     * @param  {Boolean} options.retryOnDisconnect
     * @param  {Boolean} options.waitResult
     * @param  {Object}  randomId
     * @return {Promise}
     */
    update(query, modifier, options = {}) {
      let localUpdate;
      const { quiet, retryOnDisconnect = true, waitResult, ...otherOpts } = options;

      if (!quiet) {
        const methodName = `/${this.db.modelName}/update`;
        const applyOpts = { retryOnDisconnect: !!retryOnDisconnect };
        const result = connection.methodManager
          .apply(methodName, [query, modifier, otherOpts], applyOpts);

        if (waitResult) {
          return result;
        } else {
          result.then(null, (e) => {
            return localUpdate.then((res) => {
              return _map(res.updated, (d, i) => {
                if (!res.original[i]) {
                  return this.db.remove(d._id, {quiet: true});
                } else {
                  const docId = res.original[i]._id;
                  delete res.original[i]._id;
                  return this.db.update({_id: docId}, res.original[i],
                    {quiet: true, upsert: true});
                }
              });
            }).then(() => {
              throw e;
            });
          });
        }
      }

      localUpdate = super.update(query, modifier, options);
      return localUpdate;
    }

    _handleConnected(reconnected) {
      const methodName = `/${this.db.modelName}/sync`;
      return this.db.ids().then(ids =>
        connection.methodManager.apply(methodName, [ids]).result()
      ).then(removedIds =>
        this.db.remove({_id: {$in: removedIds}}, {quiet: true, multi: true})
      );
    }

    _handleRemoteAdded(msg) {
      if (msg.collection === this.db.modelName) {
        delete msg.fields._id;
        return this.db.update({_id: msg.id},
          msg.fields, {quiet: true, upsert: true});
      } else {
        return Promise.resolve();
      }
    }

    _handleRemoteChanged(msg) {
      if (msg.collection === this.db.modelName) {
        const modifier = {};
        if (Array.isArray(msg.cleared) && msg.cleared.length > 0) {
          modifier.$unset = {};
          for (const f of msg.cleared) {
            modifier.$unset[f] = 1;
          }
        }
        if (msg.fields) {
          delete msg.fields._id;
          modifier.$set = {};
          _each(msg.fields, (v, k) => {
            modifier.$set[k] = v;
          });
        }

        if (_keys(modifier).length > 0) {
          return this.db.update(msg.id, modifier, {quiet: true});
        }
      } else {
        return Promise.resolve();
      }
    }

    _handleRemoteRemoved(msg) {
      if (msg.collection === this.db.modelName) {
        return this.db.remove(msg.id, {quiet: true});
      } else {
        return Promise.resolve();
      }
    }
  }

  return CollectionManager;
}
