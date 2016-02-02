import _each from 'fast.js/forEach';
import { EventEmitter } from 'marsdb';
import invariant from 'invariant';
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

    connection.on('status:disconnected', this._handleDisconnected.bind(this));
    connection.on('message:result', this._handleMethodResult.bind(this));
    connection.on('message:updated', this._handleMethodUpdated.bind(this));
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
  apply(method, params, randomSeed) {
    invariant(
      typeof method === 'string',
      'Method name must be a string, but given type is %s',
      typeof method
    );

    invariant(
      !params || Array.isArray(params),
      'Params must be an array or undefined, but given type is %s',
      typeof params
    );

    const call = new MethodCall(method, params, randomSeed, this.conn);
    this._methods[call.id] = call;

    const cleanupCallback = () => {
      if (
        this._methods[call.id] && this._methods[call.id]._result &&
        this._methods[call.id]._updated
      ) {
        delete this._methods[call.id];
      }
    };
    call.result().then(cleanupCallback)
      .updated().then(cleanupCallback);

    return call;
  }

  _handleMethodResult(msg) {
    if (msg.id && this._methods[msg.id]) {
      this._methods[msg.id]._handleResultMessage(msg);
    }
  }

  _handleMethodUpdated(msg) {
    _each(msg.methods, (mid) => {
      if (this._methods[mid]) {
        this._methods[mid]._handleUpdatedMessage(msg);
      }
    });
  }

  _handleDisconnected() {
    _each(this._methods, (methodCall) => {
      methodCall._handleResultMessage({
        error: new Error('Disconnected, method can\'t be done'),
      });
    });
    this._methods = {};
  }
}
