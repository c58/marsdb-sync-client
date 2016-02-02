/**
 * Class for tracking method call status.
 */
export default class MethodCall extends EventEmitter {
  constructor(method, params, randomSeed, connection) {
    super();
    this.id = connection.sendMethod(method, params, randomSeed);
  }

  result = () => {
    return this._promiseMixed(
      new Promise((resolve, reject) => {
        if (this._error) {
          reject(this._error);
        } else if (this._result) {
          resolve(this._result);
        } else {
          this.once('result', resolve);
          this.once('error', reject);
        }
      })
    );
  };

  updated = () => {
    return this._promiseMixed(
      new Promise((resolve, reject) => {
        if (this._updated) {
          resolve();
        } else {
          this.once('updated', resolve);
        }
      })
    );
  };

  _promiseMixed(promise) {
    return {
      result: this.result,
      updated: this.updated,
      then: (...args) => this._promiseMixed(promise.then(...args)),
    };
  }

  _handleResultMessage(msg) {
    if (msg.id == this.id) {
      if (msg.error) {
        this._error = msg.error;
        this.emit('error', msg.error);
      } else {
        this._result = msg.result;
        this.emit('result', msg.result);
      }
    }
  }

  _handleUpdatedMessage(msg) {
    this._updated = true;
    this.emit('updated');
  }
}
