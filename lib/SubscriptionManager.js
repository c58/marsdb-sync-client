import _each from 'fast.js/forEach';
import { EventEmitter } from 'marsdb';
import Subscription from './Subscription';


// Utils
function _getArgumentsHash() {
  var args = Array.prototype.slice.call(arguments);
  return JSON.stringify(args);
}


/**
 * The manager tracks all subscriptions on the application
 * and make reaction on some life-cycle events, like stop
 * subscription.
 */
export default class SubscriptionManager extends EventEmitter {
  // @ngInject
  constructor(connection) {
    super();
    this.subscriptionsByHash = {};
    this.subscriptionsById = {};
    this.loadingSet = new Set();
    this.conn = connection;

    connection.on('status:connected', this._handleConnected.bind(this));
    connection.on('status:disconnected', this._handleDisconnected.bind(this));
    connection.on('message:ready', this._handleSubscriptionReady.bind(this));
    connection.on('message:nosub', this._handleSubscriptionNosub.bind(this));
  }

  subscribe(name, ...params) {
    const subHash = _getArgumentsHash.apply(null, arguments);
    let sub = this.subscriptionsByHash[subHash];

    if (!sub) {
      sub = new Subscription(name, params, subHash, this.conn);
      if (this.conn.isConnected) {
        sub._subscribe();
      } else {
        sub._freeze();
      }
      this._registerSub(sub);
    } else {
      sub._subscribe({dontSubFrozen: true});
    }

    if (!sub.isReady) {
      this._trackLoadingStart(sub.id);
    }

    return sub;
  }

  _registerSub(sub) {
    this.subscriptionsByHash[sub.hash] = sub;
    this.subscriptionsById[sub.id] = sub;

    const cleanupCallback = () => {
      delete this.subscriptionsByHash[sub.hash];
      delete this.subscriptionsById[sub.id];
      this._trackLoadingReady(sub.id);
    };

    sub.stopped().then(cleanupCallback)
       .faulted().then(cleanupCallback);
  }

  _handleConnected(reconnected) {
    _each(this.subscriptionsById, (sub, sid) => {
      const newId = sub._subscribe();
      if (newId !== sid) {
        this._trackLoadingReady(sid);
        this._trackLoadingStart(newId);
        delete this.subscriptionsById[sid];
        this.subscriptionsById[newId] = sub;
      }
    });
  }

  _handleDisconnected() {
    _each(this.subscriptionsById, (sub, sid) => {
      sub._freeze();
      if (sub.isFrozen) {
        this._trackLoadingStart(sid);
      }
    });
  }

  _handleSubscriptionReady(msg) {
    _each(msg.subs, (sid) => {
      const sub = this.subscriptionsById[sid];
      if (sub) {
        sub._handleReadyMessage(msg);
        this._trackLoadingReady(sid);
      }
    });
  }

  _handleSubscriptionNosub(msg) {
    const sub = this.subscriptionsById[msg.id];
    if (msg.id && sub) {
      sub._handleNosubMessage(msg);
    }
  }

  _trackLoadingStart(subId) {
    const prevSize = this.loadingSet.size;
    this.loadingSet.add(subId);
    if (prevSize === 0 && this.loadingSet.size > 0) {
      this.emit('loading');
    }
  }

  _trackLoadingReady(subId) {
    const prevSize = this.loadingSet.size;
    this.loadingSet.delete(subId);
    if (prevSize > 0 && this.loadingSet.size === 0) {
      this.emit('ready');
    }
  }
}
