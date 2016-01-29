import { EventEmitter } from 'marsdb';
import invariant from 'invariant';


/**
 * Class for tracking method call status.
 */
class MethodCall extends EventEmitter {
  constructor(method, params, randomSeed, DDP, $q) {
    super();
    this.$q = $q;
    this.id = DDP.method(method, params, randomSeed);
  }

  result() {
    return this._promiseMixed(this.$q.resolve(
      new Promise((resolve, reject) => {
        this.once('result', resolve);
        this.once('error', reject);
      })
    ));
  }

  updated() {
    return this._promiseMixed(this.$q.resolve(
      new Promise((resolve, reject) => {
        this.once('updated', resolve);
      })
    ));
  }

  _promiseMixed(promise) {
    return {
      result: this.result.bind(this),
      updated: this.updated.bind(this),
      then: (...args) => this._promiseMixed(promise.then(...args)),
    };
  }

  _handleResultMessage(msg) {
    this._result = true;
    if (msg.id == this.id) {
      if (msg.error) {
        process.nextTick(() => this.emit('error', msg.error));
      } else {
        process.nextTick(() => this.emit('result', msg.result));
      }
    }
  }

  _handleUpdatedMessage(msg) {
    this._updated = true;
    process.nextTick(() => this.emit('updated'));
  }
}


/**
 * Make an RPC calls and track results.
 * Track a DDP connection for canceling active
 * methods calls.
 */
export class MethodCallManager {
  // @ngInject
  constructor(DDP, $q) {
    this.$q = $q;

    // Setup DDP connection
    this.DDP = DDP;
    this.DDP.on('disconnected', this._handleDisconnected.bind(this));
    this.DDP.on('message:result', this._handleMethodResult.bind(this));
    this.DDP.on('message:updated', this._handleMethodUpdated.bind(this));

    // Internal fields
    this.methods = {};
  }

  /**
   * Call a Meteor method
   * @param  {String} method
   * @param  {...}    param1, param2, ..
   * @return {MethodCall}
   */
  call(method /* , param1, param2, ... */) {
    var params = Array.prototype.slice.call(arguments, 1);
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
      'Method name must be a string, buy given type is %s',
      typeof method
    );

    invariant(
      !params || Array.isArray(params),
      'Params must be an array or undefined, but given type is %s',
      typeof params
    );

    const call = new MethodCall(method, params, randomSeed, this.DDP, this.$q);
    this.methods[call.id] = call;

    const cleanupCallback = () => {
      if (
        this.methods[call.id] && this.methods[call.id]._result &&
        this.methods[call.id]._updated
      ) {
        delete this.methods[call.id];
      }
    };
    call.result().then(cleanupCallback)
      .updated().then(cleanupCallback);

    return call;
  }

  _handleMethodResult(msg) {
    if (msg.id && this.methods[msg.id]) {
      this.methods[msg.id]._handleResultMessage(msg);
    }
  }

  _handleMethodUpdated(msg) {
    if (Array.isArray(msg.methods)) {
      for (const mid of msg.methods) {
        if (this.methods[mid]) {
          this.methods[mid]._handleUpdatedMessage(msg);
        }
      }
    }
  }

  _handleDisconnected() {
    for (const mid of Object.keys(this.methods)) {
      this.methods[mid]._handleResultMessage({
        error: new Error('Disconnected, method can\'t be done'),
      });
    }

    this.methods = {};
  }
}
