import { EventEmitter } from 'marsdb';


// Status of the subsctiption
const STOP_PENDING_TIMEOUT = 15000;
const SUB_STATUS = {
  READY_PENDING: 'READY_PENDING',
  READY: 'READY',
  ERROR: 'ERROR',
  STOP_PENDING: 'STOP_PENDING',
  STOPPED: 'STOPPED',
  FROZEN: 'FROZEN',
};


/**
 * Class for storing Subscription with
 * delayed pending feature.
 */
export default class Subscription extends EventEmitter {
  constructor(name, params, hash, conn) {
    super();
    this.name = name;
    this.params = params;
    this.hash = hash;
    this.id = hash;
    this.conn = conn;
    this._ready = false;
  }

  get isReady() {
    return (
      this.status == SUB_STATUS.READY ||
      (this.status === SUB_STATUS.FROZEN && this._ready)
    );
  }

  get isStopped() {
    return this.status === SUB_STATUS.STOPPED;
  }

  get isFaulted() {
    return this.status === SUB_STATUS.ERROR;
  }

  get isFrozen() {
    return this.status == SUB_STATUS.FROZEN;
  }

  ready = () => {
    return this._promiseMixed(
      new Promise((resolve, reject) => {
        if (this.isReady) {
          resolve();
        } else {
          this.once(SUB_STATUS.READY, resolve);
        }
      })
    );
  };

  stopped = () => {
    return this._promiseMixed(
      new Promise((resolve, reject) => {
        if (this.isStopped) {
          resolve();
        } else {
          this.once(SUB_STATUS.STOPPED, resolve);
        }
      })
    );
  };

  faulted = () => {
    return this._promiseMixed(
      new Promise((resolve, reject) => {
        if (this.isFaulted) {
          resolve();
        } else {
          this.once(SUB_STATUS.ERROR, resolve);
        }
      })
    );
  };

  stop() {
    this._scheduleStop();
  }

  _promiseMixed(promise) {
    return {
      stopped: this.stopped,
      ready: this.ready,
      faulted: this.faulted,
      then: (...args) => this._promiseMixed(promise.then(...args)),
    };
  }

  _subscribe(options) {
    if (
      !this.status ||
      this.status === SUB_STATUS.STOP_PENDING ||
      this.status === SUB_STATUS.ERROR ||
      this.status === SUB_STATUS.FROZEN
    ) {
      if (this.status === SUB_STATUS.STOP_PENDING) {
        if (this._ready) {
          this._clearStopper();
          this._setStatus(SUB_STATUS.READY);
        } else {
          this._setStatus(SUB_STATUS.READY_PENDING);
        }
      } else if (
        !options || !options.dontSubFrozen ||
        this.status !== SUB_STATUS.FROZEN
      ) {
        this._setStatus(SUB_STATUS.READY_PENDING);
        this.id = this.conn.sendSub(this.name, this.params);
      }
    }
    return this.id;
  }

  _scheduleStop() {
    if (
      (this.status === SUB_STATUS.READY_PENDING ||
      this.status === SUB_STATUS.READY) &&
      this.status !== SUB_STATUS.STOP_PENDING
    ) {
      this._setStatus(SUB_STATUS.STOP_PENDING);
      this._stopTimer = setTimeout(
        () => this._stopImmediately(),
        STOP_PENDING_TIMEOUT
      );
    }
  }

  _stopImmediately(options) {
    if (this.status !== SUB_STATUS.STOPPED) {
      this._clearStopper();
      this._setStatus(SUB_STATUS.STOPPED);

      if (!options || !options.dontSendMsg) {
        this.conn.sendUnsub(this.id);
      }
    }
  }

  _freeze() {
    if (this.status === SUB_STATUS.STOP_PENDING) {
      this._stopImmediately({dontSendMsg: true});
    } else if (!this.status || this.status !== SUB_STATUS.STOPPED) {
      this._setStatus(SUB_STATUS.FROZEN);
    }
  }

  _handleNosubMessage(msg) {
    this._clearStopper();
    if (msg.error) {
      this._setStatus(SUB_STATUS.ERROR, msg.error);
    } else {
      this._stopImmediately({dontSendMsg: true});
    }
  }

  _handleReadyMessage(msg) {
    this._ready = true;
    if (
      this.status !== SUB_STATUS.STOPPED &&
      this.status !== SUB_STATUS.STOP_PENDING
    ) {
      this._setStatus(SUB_STATUS.READY);
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
