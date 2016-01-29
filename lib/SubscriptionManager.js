import { EventEmitter } from 'marsdb';
import keyMirror from 'keymirror';


// Utils
function _getArgumentsHash() {
  var args = Array.prototype.slice.call(arguments);
  return JSON.stringify(args);
}


// Status of the subsctiption
const STOP_PENDING_TIMEOUT = 15000;
export const SUB_STATUS = keyMirror({
  ready_pending: null,
  ready: null,
  error: null,
  stop_pending: null,
  stopped: null,
  frozen: null,
});


/**
 * Class for storing Subscription with
 * delayed pending feature.
 */
class Subscription extends EventEmitter {
  constructor(name, params, hash, DDP, $q) {
    super();
    this.$q = $q;
    this.name = name;
    this.params = params;
    this.hash = hash;
    this.id = hash;
    this.DDP = DDP;
    this._ready = false;
  }

  ready() {
    return this._promiseMixed(this.$q.resolve(
      new Promise((resolve, reject) => {
        if (this.isReady) {
          resolve();
        } else {
          this.once(SUB_STATUS.ready, resolve);
        }
      })
    ));
  }

  stopped() {
    return this._promiseMixed(this.$q.resolve(
      new Promise((resolve, reject) => {
        if (this.isStopped) {
          resolve();
        } else {
          this.once(SUB_STATUS.stopped, resolve);
        }
      })
    ));
  }

  faulted() {
    return this._promiseMixed(this.$q.resolve(
      new Promise((resolve, reject) => {
        if (this.isFaulted) {
          resolve();
        } else {
          this.once(SUB_STATUS.error, resolve);
        }
      })
    ));
  }

  get isReady() {
    return (
      this.status == SUB_STATUS.ready ||
      (this.status === SUB_STATUS.frozen && this._ready)
    );
  }

  get isStopped() {
    return this.status === SUB_STATUS.stopped;
  }

  get isFaulted() {
    return this.status === SUB_STATUS.error;
  }

  get isFrozen() {
    return this.status == SUB_STATUS.frozen;
  }

  stop() {
    this._scheduleStop();
  }

  _promiseMixed(promise) {
    return {
      stopped: this.stopped.bind(this),
      ready: this.ready.bind(this),
      faulted: this.faulted.bind(this),
      then: (...args) => this._promiseMixed(promise.then(...args)),
    };
  }

  _subscribe(options) {
    if (
      !this.status ||
      this.status === SUB_STATUS.stop_pending ||
      this.status === SUB_STATUS.error ||
      this.status === SUB_STATUS.frozen
    ) {
      if (this.status === SUB_STATUS.stop_pending) {
        if (this._ready) {
          this._clearStopper();
          this._setStatus(SUB_STATUS.ready);
        } else {
          this._setStatus(SUB_STATUS.ready_pending);
        }
      } else if (
        !options || !options.dontSubFrozen ||
        this.status !== SUB_STATUS.frozen
      ) {
        this._setStatus(SUB_STATUS.ready_pending);
        this.id = this.DDP.sub(this.name, this.params);
      }
    }
    return this.id;
  }

  _scheduleStop() {
    if (
      (this.status === SUB_STATUS.ready_pending ||
      this.status === SUB_STATUS.ready) &&
      this.status !== SUB_STATUS.stop_pending
    ) {
      this._setStatus(SUB_STATUS.stop_pending);
      this._stopTimer = setTimeout(
        () => this._stopImmediately(),
        STOP_PENDING_TIMEOUT
      );
    }
  }

  _stopImmediately(options) {
    if (this.status !== SUB_STATUS.stopped) {
      this._clearStopper();
      this._setStatus(SUB_STATUS.stopped);

      if (!options || !options.dontSendMsg) {
        this.DDP.unsub(this.id);
      }
    }
  }

  _freeze() {
    if (this.status === SUB_STATUS.stop_pending) {
      this._stopImmediately({dontSendMsg: true});
    } else if (!this.status || this.status !== SUB_STATUS.stopped) {
      this._setStatus(SUB_STATUS.frozen);
    }
  }

  _handleNosubMessage(msg) {
    this._clearStopper();
    if (msg.error) {
      this._setStatus(SUB_STATUS.error, msg.error);
    } else {
      this._stopImmediately({dontSendMsg: true});
    }
  }

  _handleReadyMessage(msg) {
    this._ready = true;
    if (
      this.status !== SUB_STATUS.stopped &&
      this.status !== SUB_STATUS.stop_pending
    ) {
      this._setStatus(SUB_STATUS.ready);
    }
  }

  _setStatus(status, a, b, c, d) {
    this.status = status;
    this.emit(status, a, b, c, d);
  }

  _clearStopper() {
    clearTimeout(this._stopTimer);
    this._stopTimer = null;
  }
}


/**
 * The manager tracks all subscriptions on the application
 * and make reaction on some life-cycle events, like stop
 * subscription.
 */
export class SubscriptionManager extends EventEmitter {
  // @ngInject
  constructor(DDP, $q) {
    super();
    this.$q = $q;

    // Setup DDP connection
    this.DDP = DDP;
    this.DDP.on('connected', this._handleConnected.bind(this));
    this.DDP.on('disconnected', this._handleDisconnected.bind(this));
    this.DDP.on('message:ready', this._handleSubscriptionReady.bind(this));
    this.DDP.on('message:nosub', this._handleSubscriptionNosub.bind(this));

    // Internal fields
    this.subscriptionsByHash = {};
    this.subscriptionsById = {};
    this.loadingSet = new Set();
  }

  subscribe(name, ...params) {
    const subHash = _getArgumentsHash.apply(null, arguments);
    var sub = this.subscriptionsByHash[subHash];

    if (!sub) {
      sub = new Subscription(name, params, subHash, this.DDP, this.$q);
      if (this.DDP.isConnected()) {
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

    const cleanupCallback = this._unregisterSub.bind(this, sub);
    sub.stopped().then(cleanupCallback)
       .faulted().then(cleanupCallback);
  }

  _unregisterSub(sub) {
    delete this.subscriptionsByHash[sub.hash];
    delete this.subscriptionsById[sub.id];
    this._trackLoadingReady(sub.id);
  }

  _handleConnected(reconnected) {
    // resubscribe in a last stage of reconnection
    for (const sid of Object.keys(this.subscriptionsById)) {
      const sub = this.subscriptionsById[sid];
      const newId = sub._subscribe();
      if (newId !== sid) {
        this._trackLoadingReady(sid);
        this._trackLoadingStart(newId);
        delete this.subscriptionsById[sid];
        this.subscriptionsById[newId] = sub;
      }
    }
  }

  _handleDisconnected() {
    for (const sid of Object.keys(this.subscriptionsById)) {
      const sub = this.subscriptionsById[sid];
      sub._freeze();
      if (sub.isFrozen) {
        this._trackLoadingStart(sid);
      }
    }
  }

  _handleSubscriptionReady(msg) {
    if (Array.isArray(msg.subs)) {
      for (const sid of msg.subs) {
        const sub = this.subscriptionsById[sid];
        if (sub) {
          sub._handleReadyMessage(msg);
          this._trackLoadingReady(sid);
        }
      }
    }
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
