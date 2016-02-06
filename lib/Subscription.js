const EventEmitter = typeof window !== 'undefined' && window.Mars
  ? window.Mars.EventEmitter : require('marsdb').EventEmitter;
const Random = typeof window !== 'undefined' && window.Mars
  ? window.Mars.Random : require('marsdb').Random;


// Status of the subsctiption
export const SUB_STATUS = {
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
  constructor(name, params, conn, stopWaitTimeout = 15000) {
    super();
    this.id = Random.default().id(20);
    this.name = name;
    this.params = params;
    this._conn = conn;
    this._ready = false;
    this._stopWaitTimeout = stopWaitTimeout;
  }

  get isReady() {
    return (
      this.status == SUB_STATUS.READY ||
      (this.status === SUB_STATUS.FROZEN && this._ready)
    );
  }

  get isReadyPending() {
    return this.status === SUB_STATUS.READY_PENDING;
  }

  get isStopped() {
    return this.status === SUB_STATUS.STOPPED;
  }

  get isStopPending() {
    return this.status === SUB_STATUS.STOP_PENDING;
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
          this.once(SUB_STATUS.ERROR, reject);
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
          this.once(SUB_STATUS.ERROR, reject);
        }
      })
    );
  };

  stop = () => {
    this._scheduleStop();
  };

  then(succFn, failFn) {
    return this.ready().then(succFn, failFn);
  }

  _promiseMixed(promise) {
    return {
      stopped: this.stopped,
      ready: this.ready,
      stop: this.stop,
      then: (...args) => this._promiseMixed(promise.then(...args)),
    };
  }

  _subscribe() {
    if (
      !this.status ||
      this.status === SUB_STATUS.STOP_PENDING ||
      this.status === SUB_STATUS.STOPPED ||
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
      } else {
        this._setStatus(SUB_STATUS.READY_PENDING);
        this._conn.sendSub(this.name, this.params, this.id);
      }
    }
  }

  _scheduleStop() {
    if (
      this.status !== SUB_STATUS.STOP_PENDING &&
      this.status !== SUB_STATUS.STOPPED
    ) {
      this._setStatus(SUB_STATUS.STOP_PENDING);
      this._stopTimer = setTimeout(
        () => this._stopImmediately(),
        this._stopWaitTimeout
      );
    }
  }

  _stopImmediately(options) {
    if (this.status !== SUB_STATUS.STOPPED) {
      this._clearStopper();
      this._setStatus(SUB_STATUS.STOPPED);
      this._ready = false;

      if (!options || !options.dontSendMsg) {
        this._conn.sendUnsub(this.id);
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

  _setStatus(status, a, b, c, d) {
    this.status = status;
    this.emit(status, a, b, c, d);
  }

  _clearStopper() {
    clearTimeout(this._stopTimer);
    this._stopTimer = null;
  }

  _handleNosub(error) {
    this._clearStopper();
    if (error) {
      this._setStatus(SUB_STATUS.ERROR, error);
    } else {
      this._stopImmediately({dontSendMsg: true});
    }
  }

  _handleReady() {
    if (
      this.status !== SUB_STATUS.STOPPED &&
      this.status !== SUB_STATUS.STOP_PENDING
    ) {
      this._ready = true;
      this._setStatus(SUB_STATUS.READY);
    }
  }
}
