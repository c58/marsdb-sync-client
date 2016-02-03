import _bind from 'fast.js/function/bind';
import _each from 'fast.js/forEach';
import _keys from 'fast.js/object/keys';
import Collection from 'marsdb';


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
      const localInsert = super.insert(doc, options, randomId);

      if (!options.quiet) {
        const methodName = `/${this.db.modelName}/insert`;
        const handleInsertError = (e) => {
          return localInsert.then(() =>
            this.db.remove(doc._id, {quiet: true})
          ).then(() => {
            throw e;
          });
        };

        connection.methodManager.apply(methodName, [doc, options], randomId.seed)
          .result().then(null, handleInsertError);
      }

      return localInsert;
    }

    remove(query, options = {}) {
      const localRemove = super.remove(query, options);

      if (!options.quiet) {
        const methodName = `/${this.db.modelName}/remove`;
        const handleRemoveError = (e) => {
          return localRemove.then((removedDocs) =>
            this.db.insertAll(removedDocs, {quiet: true})
          ).then(() => {
            throw e;
          });
        };

        connection.methodManager.apply(methodName, [query, options])
          .result().then(null, handleRemoveError);
      }

      return localRemove;
    }

    update(query, modifier, options = {}) {
      const localUpdate = super.update(query, modifier, options);

      if (!options.quiet) {
        const methodName = `/${this.db.modelName}/update`;
        const handleUpdateError = (e) => {
          return localUpdate.then((res) => {
            if (res.inserted) {
              this.db.remove(res.inserted._id, {quiet: true});
            } else {
              _each(res.original, (d) => {
                const docId = d._id;
                delete d._id;
                this.db.update({_id: docId}, d, {quiet: true, upsert: true});
              });
            }
          }).then(() => {
            throw e;
          });
        };

        connection.methodManager.apply(methodName, [query, modifier, options])
          .result().then(null, handleUpdateError);
      }

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
        this.db.remove({_id: {$in: removedIds}}, {quiet: true})
      );
    }
  }

  return CollectionManager;
}
