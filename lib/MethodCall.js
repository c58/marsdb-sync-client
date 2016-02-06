import _bind from 'fast.js/function/bind';
const EventEmitter = typeof window !== 'undefined' && window.Mars
  ? window.Mars.EventEmitter : require('marsdb').EventEmitter;
const Random = typeof window !== 'undefined' && window.Mars
  ? window.Mars.Random : require('marsdb').Random;



// Method call statuses
export const CALL_STATUS = {
  RESULT: 'RESULT',
  ERROR: 'ERROR',
  UPDATED: 'UPDATED',
};


/**
 * Class for tracking method call status.
 */
export default class MethodCall extends EventEmitter {
  constructor(method, params, randomSeed, connection) {
    super();
    this.id = Random.default().id(20);
    connection.sendMethod(method, params, this.id, randomSeed);
  }

  /**
   * Returns a promise that will be resolved when result
   * of funciton call is received. It is also have "result"
   * and "updated" fields for chaining
   * @return {Promise}
   */
  result = () => {
    return this._promiseMixed(
      new Promise((resolve, reject) => {
        if (this._error) {
          reject(this._error);
        } else if (this._result) {
          resolve(this._result);
        } else {
          this.once(CALL_STATUS.RESULT, resolve);
          this.once(CALL_STATUS.ERROR, reject);
        }
      })
    );
  };

  /**
   * Returns a promise that will be resolved when updated
   * message received for given funciton call. It is also
   * have "result" and "updated" fields for chaining.
   * @return {Promise}
   */
  updated = () => {
    return this._promiseMixed(
      new Promise((resolve, reject) => {
        if (this._updated) {
          resolve();
        } else {
          this.once(CALL_STATUS.UPDATED, resolve);
        }
      })
    );
  }

  then(succFn, failFn) {
    return this.updated().then(() => {
      return this.result(succFn, failFn);
    }, failFn);
  }

  _promiseMixed(promise) {
    return {
      result: this.result,
      updated:this.updated,
      then: (...args) => this._promiseMixed(promise.then(...args)),
    };
  }

  _handleResult(error, result) {
    if (error) {
      this._error = error;
      this.emit(CALL_STATUS.ERROR, error);
    } else {
      this._result = result;
      this.emit(CALL_STATUS.RESULT, result);
    }
  }

  _handleUpdated(msg) {
    this._updated = true;
    this.emit(CALL_STATUS.UPDATED);
  }
}
