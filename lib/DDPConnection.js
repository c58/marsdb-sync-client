import _try from 'fast.js/function/try';
import _bind from 'fast.js/function/bind';
import { Random, EJSON } from 'marsdb';
import PromiseQueue from 'marsdb/dist/PromiseQueue';
import AsyncEventEmitter from 'marsdb/dist/AsyncEventEmitter';
import HeartbeatManager from 'marsdb-sync-server/dist/HeartbeatManager';


// Status of a DDP connection
const DDP_VERSION = 1;
const HEARTBEAT_INTERVAL = 17500;
const HEARTBEAT_TIMEOUT = 15000;
const RECONNECT_INTERVAL = 5000;
export const CONN_STATUS = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
};


export default class DDPConnection extends AsyncEventEmitter {
  constructor({ url, socket = WebSocket, autoReconnect = true }) {
    super();
    this.url = url;
    this._queue = new PromiseQueue(1);
    this._sessionId = null;
    this._autoReconnect = autoReconnect;
    this._socket = socket;
    this._status = CONN_STATUS.DISCONNECTED;

    this._heartbeat = new HeartbeatManager(
      HEARTBEAT_INTERVAL, HEARTBEAT_TIMEOUT
    );
    this._heartbeat.on('timeout', _bind(this._handleHearbeatTimeout, this));
    this._heartbeat.on('sendPing', _bind(this.sendPing, this));
    this._heartbeat.on('sendPong', _bind(this.sendPong, this));
    this.connect();
  }

  /**
   * Returns true if client is fully connected to a server
   * @return {Boolean}
   */
  get isConnected() {
    return this._status === CONN_STATUS.CONNECTED;
  }

  /**
   * Returns true if client disconnected
   * @return {Boolean}
   */
  get isDisconnected() {
    return this._status === CONN_STATUS.DISCONNECTED;
  }

  /**
   * Sends a "method" message to the server with given
   * parameters
   * @param  {String} name
   * @param  {String} params
   * @param  {String} id
   * @param  {String} randomSeed
   */
  sendMethod(name, params = [], id, randomSeed) {
    const msg = {
      msg: 'method',
      id: id,
      method: name,
      params: params,
    };
    if (randomSeed) {
      msg.randomSeed = randomSeed;
    }
    this._sendMessage(msg);
  }

  /**
   * Send "sub" message to the server with given
   * publusher name and parameters
   * @param  {String} name
   * @param  {Array} params
   * @param  {String} id
   */
  sendSub(name, params = [], id) {
    this._sendMessage({
      msg: 'sub',
      id: id,
      name: name,
      params: params,
    });
  }

  /**
   * Send "unsub" message to the server for given
   * subscription id
   * @param  {String} id
   */
  sendUnsub(id) {
    this._sendMessage({
      msg: 'unsub',
      id: id,
    });
  }

  /**
   * Send a "ping" message with randomly generated ping id
   */
  sendPing() {
    this._sendMessage({
      msg: 'ping',
      id: Random.default().id(20),
    });
  }

  /**
   * Sends a "pong" message for given id of ping message
   * @param  {String} id
   */
  sendPong(id) {
    this._sendMessage({
      msg: 'pong',
      id: id,
    });
  }

  /**
   * Make a new WebSocket connection to the server
   * if we are not connected yet (isDicsonnected).
   * Returns true if connecting, false if already connectiong
   * @returns {Boolean}
   */
  connect() {
    if (this.isDisconnected) {
      this._rawConn = new (this._socket)(this.url);
      this._rawConn.onopen = _bind(this._handleOpen, this);
      this._rawConn.onerror = _bind(this._handleError, this);
      this._rawConn.onclose = _bind(this._handleClose, this);
      this._rawConn.onmessage = _bind(this._handleRawMessage, this);
      this._setStatus(CONN_STATUS.CONNECTING);
      return true;
    }
    return false;
  }

  /**
   * Reconnect to the server with unlimited tries. A period
   * of tries is 5 seconds. It reconnects only if not
   * connected. It cancels previously scheduled `connect` by `reconnect`.
   * Returns a function for canceling reconnection process or undefined
   * if connection is not disconnected.
   * @return {Function}
   */
  reconnect() {
    if (this.isDisconnected) {
      clearTimeout(this._reconnTimer);
      this._reconnecting = true;
      this._reconnTimer = setTimeout(
        _bind(this.connect, this),
        RECONNECT_INTERVAL
      );

      return () => {
        clearTimeout(this._reconnTimer);
        this._reconnecting = false;
        this.disconnect();
      };
    }
  }

  /**
   * Close WebSocket connection. If autoReconnect is enabled
   * (enabled by default), then after 5 sec reconnection will
   * be initiated.
   */
  disconnect() {
    _try(() => this._rawConn && this._rawConn.close());
  }

  _handleOpen() {
    this._heartbeat.waitPing();
    this._sendMessage({
      msg: 'connect',
      session: this._sessionId,
      version: DDP_VERSION,
      support: [DDP_VERSION],
    });
  }

  _handleConnectedMessage(msg) {
    if (!this.isConnected) {
      this._setStatus(CONN_STATUS.CONNECTED, this._reconnecting);
      this._sessionId = msg.session;
      this._reconnecting = false;
    }
  }

  _handleClose() {
    this._heartbeat._clearTimers();
    this._setStatus(CONN_STATUS.DISCONNECTED);

    if (this._autoReconnect) {
      this._reconnecting = false;
      this.reconnect();
    }
  }

  _handleHearbeatTimeout() {
    this.disconnect();
  }

  _handleError(error) {
    this.emit('error', error);
  }

  _handleRawMessage(rawMsg) {
    return this._queue.add(() => {
      const msgObj = EJSON.parse(rawMsg.data);
      return this._processMessage(msgObj);
    }).then(null, err => {
      this._handleError(err);
    });
  }

  _processMessage(msg) {
    switch (msg.msg) {
      case 'connected': return this._handleConnectedMessage(msg);
      case 'ping': return this._heartbeat.handlePing(msg);
      case 'pong': return this._heartbeat.handlePong(msg);
      case 'removed':
      case 'changed':
      case 'added':
      case 'updated':
      case 'result':
      case 'nosub':
      case 'ready':
      case 'error':
        return this.emitAsync(`message:${msg.msg}`, msg);
      default:
        throw new Error(`Unknown message type ${msg.msg}`);
    }
  }

  _sendMessage(msgObj) {
    const result = _try(() =>
      this._rawConn.send(EJSON.stringify(msgObj))
    );
    if (result instanceof Error) {
      this._handleError(result);
    }
  }

  _setStatus(status, a) {
    this._status = status;
    this.emit(`status:${status}`.toLowerCase(), a);
  }
}
