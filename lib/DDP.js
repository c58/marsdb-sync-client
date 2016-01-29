import invariant from 'invariant';
import { Random, EJSON, EventEmitter } from 'marsdb';
import SockJS from '../sockjs';
import keyMirror from 'keymirror';


// Status of a DDP connection
const DDP_VERSION = '1';
const RECONNECT_INTERVAL = 5000;
const HEARTBEAT_PING_TIMEOUT = 17500;
const HEARTBEAT_PONG_TIMEOUT = 10000;
const DDP_EVENTS = keyMirror({
  ready: null,
  nosub: null,
  added: null,
  changed: null,
  removed: null,
  result: null,
  updated: null,
  error: null,
});
const STATUS = keyMirror({
  connected: null,
  disconnected: null,
  connecting: null,
});


/**
 * Manages a heartbeat with the server
 */
export class HeartbeatManager extends EventEmitter {
  constructor() {
    super();
  }

  waitPing() {
    this._clearTimers();
    this.waitPingTimer = setTimeout(
      () => {
        this.emit('ping');
        this.waitPong();
      },
      HEARTBEAT_PING_TIMEOUT
    );
  }

  waitPong() {
    this._clearTimers();
    this.waitPongTimer = setTimeout(
      () => this.emit('timeout'),
      HEARTBEAT_PONG_TIMEOUT
    );
  }

  handlePing(id) {
    this._clearTimers();
    this.emit('pong', id);
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


/**
 * Async messages processing queue for queueing
 * messages
 */
export class AsyncProcessQueue {
  constructor(consumer) {
    this.consumer = consumer;
    this.queue = [];
  }

  push(element) {
    this.queue.push(element);
    this.process();
  }

  process() {
    process.nextTick(() => {
      if (this.queue.length !== 0) {
        var ack = this.consumer(this.queue[0]);
        if (ack) {
          this.queue.shift();
          this.process();
        }
      }
    });
  }

  empty() {
    this.queue = [];
  }
}


/**
 * Simple wrapper around SockJS, that parses all
 * incoming messages with EJSON and encodes all
 * outcoming messages with EJSON.
 * Also it process all incoming messages at the end
 * of the call stack.
 */
export class AsyncSocketWrapper extends EventEmitter {
  constructor(endpoint) {
    super();
    this.endpoint = endpoint;
  }

  emit() {
    var args = arguments;
    process.nextTick(() => {
      super.emit.apply(this, args);
    });
  }

  send(object) {
    const message = EJSON.stringify(object);
    this.rawSocket.send(message);
  }

  connect() {
    this.rawSocket = new SockJS(this.endpoint);
    this.rawSocket.onopen = () => this.emit('open');
    this.rawSocket.onerror = (error) => this.emit('error', error);
    this.rawSocket.onclose = () => this.emit('close');
    this.rawSocket.onmessage = (message) => {
      let object;
      try {
        object = EJSON.parse(message.data);
      } catch (e) {
        this.emit('message:error', e);
        return;
      }

      this.emit('message:in', object);
    };
  }

  close(status, reason) {
    invariant(
      this.rawSocket,
      'Connection is not initiated yet'
    );

    this.rawSocket.close(status, reason);
  }
}

/**
 * Simple DDP client
 */
export class DDP extends EventEmitter {
  // @ngInject
  constructor(AppSettings) {
    super();
    this._reconnecting = false;
    this._fullyConnectedOnce = false;

    this.Random = new Random();
    this.queue = new AsyncProcessQueue(this._processMessageCondition.bind(this));
    this.socket = new AsyncSocketWrapper(AppSettings.ddpEndpoint);
    this.heartbeat = new HeartbeatManager();

    this.heartbeat.on('timeout', this._handleHearbeatTimeout.bind(this));
    this.heartbeat.on('ping', this.ping.bind(this));
    this.heartbeat.on('pong', this.pong.bind(this));
    this.socket.on('open', this._handleOpen.bind(this));
    this.socket.on('error', this._handleError.bind(this));
    this.socket.on('close', this._handleClose.bind(this));
    this.socket.on('message:in', this._handleMessageIn.bind(this));
    this.socket.on('message:error', this._handleMessageError.bind(this));
    this.connect();
  }

  _handleHearbeatTimeout() {
    this.socket.close();
  }

  _handleError(error) {
    console.warn(error);
  }

  _handleOpen() {
    this.heartbeat.waitPing();
    this.socket.send({
      msg: 'connect',
      session: this.sessionId,
      version: DDP_VERSION,
      support: [DDP_VERSION],
    });
  }

  _handleClose() {
    this.reconnect();
  }

  _processMessageCondition(message) {
    if (this.status === STATUS.connected) {
      this.socket.send(message);
      return true;
    } else {
      return false;
    }
  }

  _handleMessageIn(message) {
    if (message.msg === 'connected') {
      this._setStatus(STATUS.connected, this._isReconnecting());

      this.sessionId = message.session;
      this._fullyConnectedOnce = true;
      this._reconnecting = false;

      this.queue.process();
    } else if (message.msg === 'ping') {
      this.heartbeat.handlePing(message.id);
    } else if (message.msg === 'pong') {
      this.heartbeat.handlePong(message.id);
    } else if (DDP_EVENTS[message.msg]) {
      this.emit(`message:${message.msg}`, message);
    }
  }

  _handleMessageError(error) {
    console.warn(error);
  }

  _getNextId() {
    return this.Random.hexString(20);
  }

  _setStatus(status, a, b, c) {
    this.status = status;
    this.emit(status, a, b, c);
  }

  _isReconnecting() {
    return this._fullyConnectedOnce && this._reconnecting;
  }

  connect() {
    this._setStatus(STATUS.connecting, this._isReconnecting());
    this.socket.connect();
  }

  reconnect() {
    clearTimeout(this._reconnTimer);
    this._reconnecting = true;
    this._setStatus(STATUS.disconnected);
    this._reconnTimer = setTimeout(
      this.connect.bind(this),
      RECONNECT_INTERVAL
    );
  }

  isConnected() {
    return this.status === STATUS.connected;
  }

  method(name, params, randomSeed) {
    var id = this._getNextId();

    var msg = {
      msg: 'method',
      id: id,
      method: name,
      params: params,
    };

    if (randomSeed) {
      msg.randomSeed = randomSeed;
    }

    this.queue.push(msg);
    return id;
  }

  sub(name, params) {
    var id = this._getNextId();
    this.queue.push({
      msg: 'sub',
      id: id,
      name: name,
      params: params,
    });
    return id;
  }

  unsub(id) {
    this.queue.push({
      msg: 'unsub',
      id: id,
    });
    return id;
  }

  ping() {
    var id = this._getNextId();
    this.socket.send({
      msg: 'ping',
      id: id,
    });
    return id;
  }

  pong(id) {
    this.socket.send({
      msg: 'pong',
      id: id,
    });
  }
}
