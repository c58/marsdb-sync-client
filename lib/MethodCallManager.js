import _bind from 'fast.js/function/bind';
import _each from 'fast.js/forEach';
import MethodCall from './MethodCall';


/**
 * Make an RPC calls and track results.
 * Track a DDP connection for canceling active
 * methods calls.
 */
export default class MethodCallManager {
  constructor(connection) {
    this.conn = connection;
    this._methods = {};

    connection.on('status:disconnected', _bind(this._handleDisconnected, this));
    connection.on('status:connected', _bind(this._handleConnected, this));
    connection.on('message:result', _bind(this._handleMethodResult, this));
    connection.on('message:updated', _bind(this._handleMethodUpdated, this));
  }

  /**
   * Call a Meteor method
   * @param  {String} method
   * @param  {...}    param1, param2, ..
   * @return {MethodCall}
   */
  call(method, ...params) {
    return this.apply(method, params);
  }

  /**
   * Apply a method with given parameters and
   * randomSeed
   * @param  {String} method
   * @param  {Array} params
   * @param  {String} randomSeed
   * @return {MethodCall}
   */
  apply(method, params = [], options = {}) {
    const call = new MethodCall(method, params, options, this.conn);
    this._methods[call.id] = call;

    const cleanupCallback = () => delete this._methods[call.id];
    call.then(cleanupCallback, cleanupCallback);

    if (this.conn.isConnected) {
      call._invoke();
    }

    return call;
  }

  _handleMethodResult(msg) {
    if (msg.id && this._methods[msg.id]) {
      const { result, error } = msg;
      this._methods[msg.id]._handleResult(error, result);
    }
  }

  _handleMethodUpdated(msg) {
    _each(msg.methods, (mid) => {
      if (this._methods[mid]) {
        this._methods[mid]._handleUpdated();
      }
    });
  }

  _handleDisconnected() {
    _each(this._methods, (methodCall) => {
      if (methodCall.isSent) {
        if (!methodCall.options.retryOnDisconnect) {
          methodCall._handleResult({
            reason: 'Disconnected, method can\'t be done',
            code: 'DISCONNECTED',
          });
        } else {
          methodCall._retry();
        }
      }
    });
  }

  _handleConnected() {
    _each(this._methods, (methodCall) => {
      if (methodCall.isPending) {
        methodCall._invoke();
      }
    });
  }
}
