import PromiseQueue from 'marsdb/dist/PromiseQueue';


/**
 * Collection manager is a factory for Mars.Collection
 * objects (one object by collection name).
 * It also syncing client/server changes.
 */
export class CollectionManager {
  // @ngInject
  constructor(DDP, MethodCallManager, $collection) {
    this.$collection = $collection;
    this.MethodCallManager = MethodCallManager;

    // Setup DDP connection
    this.DDP = DDP;
    this.DDP.on('connected', this._handleConnected.bind(this));
    this.DDP.on('message:added', this._handleRemoteAdded.bind(this));
    this.DDP.on('message:changed', this._handleRemoteChanged.bind(this));
    this.DDP.on('message:removed', this._handleRemoteRemoved.bind(this));

    // Internal fields
    this._collections = {};
    this._queue = new PromiseQueue();
  }

  /**
   * Return a Mars.Collection object for given
   * name.
   * @param  {String} name
   * @return {Mars.Collection}
   */
  getCollection(name) {
    var coll = this._collections[name];

    if (!coll) {
      // Create collection
      coll = this.$collection(name);
      this._collections[name] = coll;

      // Add handlers
      coll._collection.on('sync:insert', this._handleLocalInsert.bind(this, name));
      coll._collection.on('sync:update', this._handleLocalUpdate.bind(this, name));
      coll._collection.on('sync:remove', this._handleLocalRemove.bind(this, name));
    }

    return coll;
  }

  _handleConnected(reconnected) {
    // TODO sync all collections with backend
  }

  _handleLocalInsert(collName, doc, random) {
    delete doc._id;
    const methodName = `/${collName}/insert`;
    this.MethodCallManager.apply(methodName, [doc], random.seed)
      .result().then(null, (e) => {
        throw e;
      });
  }

  _handleLocalUpdate(collName, query, modifier) {
    const methodName = `/${collName}/update`;
    this.MethodCallManager.apply(methodName, [query, modifier])
      .result().then(null, (e) => {
        throw e;
      });
  }

  _handleLocalRemove(collName, query) {
    const methodName = `/${collName}/remove`;
    this.MethodCallManager.apply(methodName, [query])
      .result().then(null, (e) => {
        throw e;
      });
  }

  _handleRemoteAdded(msg) {
    this._queue.push((resolve, reject) => {
      const coll = this.getCollection(msg.collection);
      coll.ids(msg.id).then(ids => {
        if (ids.length) {
          coll.update(msg.id, msg.fields, {quiet: true})
            .then(() => resolve(), reject);
        } else {
          const doc = msg.fields;
          doc._id = msg.id;
          coll.insert(doc, {quiet: true})
            .then(() => resolve(), reject);
        }
      });
    });
  }


  _handleRemoteChanged(msg) {
    const coll = this.getCollection(msg.collection);
    var modifier = {};

    if (Array.isArray(msg.cleared) && msg.cleared.length > 0) {
      modifier.$unset = {};
      for (const f of msg.cleared) {
        modifier.$unset[f] = 1;
      }
    }

    if (msg.fields) {
      modifier.$set = {};
      for (const k of Object.keys(msg.fields)) {
        modifier.$set[k] = msg.fields[k];
      }
    }

    this._queue.push((resolve, reject) => {
      coll.update(msg.id, modifier, {quiet: true})
        .then(() => resolve(), reject);
    });
  }

  _handleRemoteRemoved(msg) {
    const coll = this.getCollection(msg.collection);
    this._queue.push((resolve, reject) => {
      coll.remove(msg.id, {quiet: true})
        .then(() => resolve(), reject);
    });
  }
}
