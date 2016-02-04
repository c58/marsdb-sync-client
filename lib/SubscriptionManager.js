import _bind from 'fast.js/function/bind';
import _each from 'fast.js/forEach';
import Subscription, { SUB_STATUS } from './Subscription';
const EventEmitter = typeof window !== 'undefined' && window.Mars
  ? window.Mars.EventEmitter : require('marsdb').EventEmitter;


// Internals
const STOP_SUB_DELAY = 15000;

/**
 * The manager tracks all subscriptions on the application
 * and make reaction on some life-cycle events, like stop
 * subscription.
 */
export default class SubscriptionManager extends EventEmitter {
  constructor(connection) {
    super();
    this._subs = {};
    this._loading = new Set();
    this._conn = connection;

    connection.on('status:connected', _bind(this._handleConnected, this));
    connection.on('status:disconnected', _bind(this._handleDisconnected, this));
    connection.on('message:ready', _bind(this._handleSubscriptionReady, this));
    connection.on('message:nosub', _bind(this._handleSubscriptionNosub, this));
  }

  /**
   * Subscribe to publisher by given name with params.
   * Return Subscription object with stop, ready, and stopped
   * methods.
   * @param  {String}    name
   * @param  {...Mixed}  params
   * @return {Subscription}
   */
  subscribe(name, ...params) {
    // Create and register subscription
    const sub = new Subscription(name, params, this._conn, STOP_SUB_DELAY);
    this._subs[sub.id] = sub;
    this._trackLoadingStart(sub.id);

    // Remove sub from manager on stop or error
    const cleanupCallback = () => {
      delete this._subs[sub.id];
      this._trackLoadingReady(sub.id);
    };
    sub.once(SUB_STATUS.STOPPED, cleanupCallback);
    sub.once(SUB_STATUS.ERROR, cleanupCallback);

    // Start subscription
    if (this._conn.isConnected) {
      sub._subscribe();
    } else {
      sub._freeze();
    }

    return sub;
  }

  /**
   * Given callback invoked anytime when all
   * subscriptions is ready. Return a function for
   * stop watching the event.
   * @return {Function}
   */
  addReadyListener(cb) {
    this.on('ready', cb);
    return () => this.removeListener('ready', cb);
  }

  /**
   * Given callback invoked when first subscription started.
   * It is not invoked for any other new subs if some sub
   * is loading.
   * @return {Function}
   */
  addLoadingListener(cb) {
    this.on('loading', cb);
    return () => this.removeListener('loading', cb);
  }

  _handleConnected() {
    _each(this._subs, sub => sub._subscribe());
  }

  _handleDisconnected() {
    _each(this._subs, (sub, sid) => {
      sub._freeze();
      if (sub.isFrozen) {
        this._trackLoadingStart(sid);
      } else {
        this._trackLoadingReady(sid);
      }
    });
  }

  _handleSubscriptionReady(msg) {
    _each(msg.subs, sid => {
      const sub = this._subs[sid];
      if (sub) {
        sub._handleReady();
        this._trackLoadingReady(sid);
      }
    });
  }

  _handleSubscriptionNosub(msg) {
    const sub = this._subs[msg.id];
    if (sub) {
      sub._handleNosub(msg.error);
    }
  }

  _trackLoadingStart(subId) {
    const prevSize = this._loading.size;
    this._loading.add(subId);
    if (prevSize === 0 && this._loading.size > 0) {
      this.emit('loading');
    }
  }

  _trackLoadingReady(subId) {
    const prevSize = this._loading.size;
    this._loading.delete(subId);
    if (prevSize > 0 && this._loading.size === 0) {
      this.emit('ready');
    }
  }
}
