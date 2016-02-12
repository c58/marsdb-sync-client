import _bind from 'fast.js/function/bind';
import _each from 'fast.js/forEach';
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

    insert(doc, options = {}, randomId = {}) {
      let localInsert;

      if (!options.quiet) {
        const methodName = `/${this.db.modelName}/insert`;
        const handleInsertError = (e) => {
          return localInsert.then(() =>
            this.db.remove(doc._id, {quiet: true})
          ).then(() => {
            throw e;
          });
        };

        const result = connection.methodManager
          .apply(methodName, [doc, options], randomId.seed)
          .then(null, handleInsertError);

        if (options.waitResult) {
          return result;
        }
      }

      localInsert = super.insert(doc, options, randomId);
      return localInsert;
    }

    remove(query, options = {}) {
      let localRemove;

      if (!options.quiet) {
        const methodName = `/${this.db.modelName}/remove`;
        const handleRemoveError = (e) => {
          return localRemove.then((removedDocs) =>
            this.db.insertAll(removedDocs, {quiet: true})
          ).then(() => {
            throw e;
          });
        };

        const result = connection.methodManager
          .apply(methodName, [query, options])
          .then(null, handleRemoveError);

        if (options.waitResult) {
          return result;
        }
      }

      localRemove = super.remove(query, options);
      return localRemove;
    }

    update(query, modifier, options = {}) {
      let localUpdate;

      if (!options.quiet) {
        const methodName = `/${this.db.modelName}/update`;
        const handleUpdateError = (e) => {
          return localUpdate.then((res) => {
            _each(res.updated, (d, i) => {
              if (!res.original[i]) {
                this.db.remove(d._id, {quiet: true});
              } else {
                const docId = res.original[i]._id;
                delete res.original[i]._id;
                this.db.update({_id: docId}, res.original[i],
                  {quiet: true, upsert: true});
              }
            });
          }).then(() => {
            throw e;
          });
        };

        const result = connection.methodManager
          .apply(methodName, [query, modifier, options])
          .then(null, handleUpdateError);

        if (options.waitResult) {
          return result;
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
