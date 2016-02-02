import _try from 'fast.js/function/try';
import _bind from 'fast.js/function/bind';
import { Random, EJSON } from 'marsdb';
import PromiseQueue from 'marsdb/dist/PromiseQueue';
import AsyncEventEmitter from 'marsdb/dist/AsyncEventEmitter';
import HeartbeatManager from 'marsdb-sync-server/dist/HeartbeatManager';


// Status of a DDP connection
const DDP_VERSION = 1;
const RECONNECT_INTERVAL = 5000;
const CONN_STATUS = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
};


export default class DDPConnection extends AsyncEventEmitter {
  constructor(endPoint, socket = WebSocket) {
    super();
    this.endPoint = endPoint;
    this._queue = new PromiseQueue(1);
    this._fullyConnectedOnce = false;
    this._sessionId = null;
    this._socket = socket;

    this._heartbeat = new HeartbeatManager();
    this._heartbeat.on('timeout', _bind(this._handleHearbeatTimeout, this));
    this._heartbeat.on('sendPing', _bind(this.sendPing, this));
    this._heartbeat.on('sendPong', _bind(this.sendPong, this));
    this.connect();
  }

  get isConnected() {
    return this._status === CONN_STATUS.CONNECTED;
  }

  sendMethod(name, params, randomSeed) {
    const id = Random.default().id(20);
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
    return id;
  }

  sendSub(name, params) {
    const id = Random.default().id(20);
    this._sendMessage({
      msg: 'sub',
      id: id,
      name: name,
      params: params,
    });
    return id;
  }

  sendUnsub(id) {
    this._sendMessage({
      msg: 'unsub',
      id: id,
    });
    return id;
  }

  sendPing() {
    const id = Random.default().id(20);
    this._sendMessage({
      msg: 'ping',
      id: id,
    });
    return id;
  }

  sendPong(id) {
    this._sendMessage({
      msg: 'pong',
      id: id,
    });
  }

  connect() {
    if (!this.isConnected) {
      this._rawConn = new (this._socket)(this.endPoint);
      this._rawConn.onopen = _bind(this._handleOpen, this);
      this._rawConn.onerror = _bind(this._handleError, this);
      this._rawConn.onclose = _bind(this._handleClose, this);
      this._rawConn.onmessage = _bind(this._handleRawMessage, this);
      this._setStatus(CONN_STATUS.CONNECTING);
    }
  }

  reconnect() {
    clearTimeout(this._reconnTimer);
    this._reconnecting = true;
    this._setStatus(CONN_STATUS.DISCONNECTED);
    this._reconnTimer = setTimeout(
      _bind(this.connect, this),
      RECONNECT_INTERVAL
    );
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
      this._fullyConnectedOnce = true;
      this._reconnecting = false;
    }
  }

  _handleClose() {
    this._heartbeat._clearTimers();
    this.reconnect();
  }

  _handleHearbeatTimeout() {
    this._rawConn.close();
  }

  _handleError(error) {
    this.emit('error', error);
  }

  _handleRawMessage(rawMsg) {
    return this._queue.add(() => {
      const res = _try(() => {
        const msgObj = EJSON.parse(rawMsg);
        return this._processMessage(msgObj);
      });
      if (res instanceof Error) {
        return this._handleError(res);
      }
      return res;
    });
  }

  _processMessage(msg) {
    switch (msg.msg) {
      case 'conected': return this._handleConnectedMessage(msg);
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

  _setStatus(status, a, b, c) {
    this._status = status;
    this.emit(`status:${status}`.toLowerCase(), a, b, c);
  }
}
