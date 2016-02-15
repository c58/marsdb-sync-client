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

      if (!options.quiet) {
        const methodName = `/${this.db.modelName}/insert`;
        const handleInsertError = (e) => {
          return localInsert
            .then(() => this.db.remove(doc._id, {quiet: true}))
            .then(() => { throw e });
        };
        const applyOpts = {
          retryOnDisconnect: options.retryOnDisconnect === false ? false : true,
          randomSeed: randomId.seed,
        };
        const result = connection.methodManager
          .apply(methodName, [doc, options], applyOpts)
          .then(null, handleInsertError);

        if (options.waitResult) {
          return result;
        } else {
          result.then(null, (e) =>
            console.error('Error while calling remote method:', e)
          );
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

      if (!options.quiet) {
        const methodName = `/${this.db.modelName}/remove`;
        const handleRemoveError = (e) => {
          return localRemove
            .then((remDocs) =>this.db.insertAll(remDocs, {quiet: true}))
            .then(() => { throw e });
        };
        const applyOpts = {
          retryOnDisconnect: options.retryOnDisconnect === false ? false : true,
        };
        const result = connection.methodManager
          .apply(methodName, [query, options], applyOpts)
          .then(null, handleRemoveError);

        if (options.waitResult) {
          return result;
        } else {
          result.then(null, (e) =>
            console.error('Error while calling remote method:', e)
          );
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

      if (!options.quiet) {
        const methodName = `/${this.db.modelName}/update`;
        const handleUpdateError = (e) => {
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
          }).then(() => { throw e });
        };

        const applyOpts = {
          retryOnDisconnect: options.retryOnDisconnect === false ? false : true,
        };
        const result = connection.methodManager
          .apply(methodName, [query, modifier, options], applyOpts)
          .then(null, handleUpdateError)

        if (options.waitResult) {
          return result;
        } else {
          result.then(null, (e) =>
            console.error('Error while calling remote method:', e)
          );
        }
      }

      localUpdate = super.update(query, modifier, options);
      return localUpdate;
    }

    _handleRemoteAdded(msg) {
      delete msg.fields._id;
      return this.db.update({_id: msg.id},
        msg.fields, {quiet: true, upsert: true});
    }

    _handleRemoteChanged(msg) {
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
    }

    _handleRemoteRemoved(msg) {
      return this.db.remove(msg.id, {quiet: true});
    }

    _handleConnected(reconnected) {
      const methodName = `/${this.db.modelName}/sync`;
      return this.db.ids().then(ids =>
        connection.methodManager.apply(methodName, [ids]).result()
      ).then(removedIds =>
        this.db.remove({_id: {$in: removedIds}}, {quiet: true, multi: true})
      );
    }
  }

  return CollectionManager;
}
