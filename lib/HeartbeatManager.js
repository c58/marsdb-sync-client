const EventEmitter = typeof window !== 'undefined' && window.Mars
  ? window.Mars.EventEmitter : require('marsdb').EventEmitter;


/**
 * Manages a heartbeat with a client
 */
export default class HeartbeatManager extends EventEmitter {
  constructor(pingTimeout = 17500, pongTimeout = 10000) {
    super();
    this.pingTimeout = pingTimeout;
    this.pongTimeout = pongTimeout;
  }

  waitPing() {
    this._clearTimers();
    this.waitPingTimer = setTimeout(
      () => {
        this.emit('sendPing');
        this.waitPong();
      },
      this.pingTimeout
    );
  }

  waitPong() {
    this._clearTimers();
    this.waitPongTimer = setTimeout(
      () => this.emit('timeout'),
      this.pongTimeout
    );
  }

  handlePing(id) {
    this._clearTimers();
    this.emit('sendPong', id);
    this.waitPing();
  }

  handlePong() {
    this._clearTimers();
    this.waitPing();
  }

  _clearTimers() {
    clearTimeout(this.waitPingTimer);
    clearTimeout(this.waitPongTimer);
  }
}
