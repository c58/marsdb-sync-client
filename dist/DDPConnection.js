'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _try2 = require('fast.js/function/try');

var _try3 = _interopRequireDefault(_try2);

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

var _marsdb = require('marsdb');

var _PromiseQueue = require('marsdb/dist/PromiseQueue');

var _PromiseQueue2 = _interopRequireDefault(_PromiseQueue);

var _AsyncEventEmitter2 = require('marsdb/dist/AsyncEventEmitter');

var _AsyncEventEmitter3 = _interopRequireDefault(_AsyncEventEmitter2);

var _HeartbeatManager = require('marsdb-sync-server/dist/HeartbeatManager');

var _HeartbeatManager2 = _interopRequireDefault(_HeartbeatManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Status of a DDP connection
var DDP_VERSION = 1;
var RECONNECT_INTERVAL = 5000;
var CONN_STATUS = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED'
};

var DDPConnection = function (_AsyncEventEmitter) {
  _inherits(DDPConnection, _AsyncEventEmitter);

  function DDPConnection(endPoint) {
    var socket = arguments.length <= 1 || arguments[1] === undefined ? WebSocket : arguments[1];

    _classCallCheck(this, DDPConnection);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(DDPConnection).call(this));

    _this.endPoint = endPoint;
    _this._queue = new _PromiseQueue2.default(1);
    _this._fullyConnectedOnce = false;
    _this._sessionId = null;
    _this._socket = socket;

    _this._heartbeat = new _HeartbeatManager2.default();
    _this._heartbeat.on('timeout', (0, _bind3.default)(_this._handleHearbeatTimeout, _this));
    _this._heartbeat.on('sendPing', (0, _bind3.default)(_this.sendPing, _this));
    _this._heartbeat.on('sendPong', (0, _bind3.default)(_this.sendPong, _this));
    _this.connect();
    return _this;
  }

  _createClass(DDPConnection, [{
    key: 'sendMethod',
    value: function sendMethod(name, params, randomSeed) {
      var id = _marsdb.Random.default().id(20);
      var msg = {
        msg: 'method',
        id: id,
        method: name,
        params: params
      };
      if (randomSeed) {
        msg.randomSeed = randomSeed;
      }
      this._sendMessage(msg);
      return id;
    }
  }, {
    key: 'sendSub',
    value: function sendSub(name, params) {
      var id = _marsdb.Random.default().id(20);
      this._sendMessage({
        msg: 'sub',
        id: id,
        name: name,
        params: params
      });
      return id;
    }
  }, {
    key: 'sendUnsub',
    value: function sendUnsub(id) {
      this._sendMessage({
        msg: 'unsub',
        id: id
      });
      return id;
    }
  }, {
    key: 'sendPing',
    value: function sendPing() {
      var id = _marsdb.Random.default().id(20);
      this._sendMessage({
        msg: 'ping',
        id: id
      });
      return id;
    }
  }, {
    key: 'sendPong',
    value: function sendPong(id) {
      this._sendMessage({
        msg: 'pong',
        id: id
      });
    }
  }, {
    key: 'connect',
    value: function connect() {
      if (!this.isConnected) {
        this._rawConn = new this._socket(this.endPoint);
        this._rawConn.onopen = (0, _bind3.default)(this._handleOpen, this);
        this._rawConn.onerror = (0, _bind3.default)(this._handleError, this);
        this._rawConn.onclose = (0, _bind3.default)(this._handleClose, this);
        this._rawConn.onmessage = (0, _bind3.default)(this._handleRawMessage, this);
        this._setStatus(CONN_STATUS.CONNECTING);
      }
    }
  }, {
    key: 'reconnect',
    value: function reconnect() {
      clearTimeout(this._reconnTimer);
      this._reconnecting = true;
      this._setStatus(CONN_STATUS.DISCONNECTED);
      this._reconnTimer = setTimeout((0, _bind3.default)(this.connect, this), RECONNECT_INTERVAL);
    }
  }, {
    key: '_handleOpen',
    value: function _handleOpen() {
      this._heartbeat.waitPing();
      this._sendMessage({
        msg: 'connect',
        session: this._sessionId,
        version: DDP_VERSION,
        support: [DDP_VERSION]
      });
    }
  }, {
    key: '_handleConnectedMessage',
    value: function _handleConnectedMessage(msg) {
      if (!this.isConnected) {
        this._setStatus(CONN_STATUS.CONNECTED, this._reconnecting);
        this._sessionId = msg.session;
        this._fullyConnectedOnce = true;
        this._reconnecting = false;
      }
    }
  }, {
    key: '_handleClose',
    value: function _handleClose() {
      this._heartbeat._clearTimers();
      this.reconnect();
    }
  }, {
    key: '_handleHearbeatTimeout',
    value: function _handleHearbeatTimeout() {
      this._rawConn.close();
    }
  }, {
    key: '_handleError',
    value: function _handleError(error) {
      this.emit('error', error);
    }
  }, {
    key: '_handleRawMessage',
    value: function _handleRawMessage(rawMsg) {
      var _this2 = this;

      return this._queue.add(function () {
        var res = (0, _try3.default)(function () {
          var msgObj = _marsdb.EJSON.parse(rawMsg);
          return _this2._processMessage(msgObj);
        });
        if (res instanceof Error) {
          return _this2._handleError(res);
        }
        return res;
      });
    }
  }, {
    key: '_processMessage',
    value: function _processMessage(msg) {
      switch (msg.msg) {
        case 'conected':
          return this._handleConnectedMessage(msg);
        case 'ping':
          return this._heartbeat.handlePing(msg);
        case 'pong':
          return this._heartbeat.handlePong(msg);
        case 'removed':
        case 'changed':
        case 'added':
        case 'updated':
        case 'result':
        case 'nosub':
        case 'ready':
        case 'error':
          return this.emitAsync('message:' + msg.msg, msg);
        default:
          throw new Error('Unknown message type ' + msg.msg);
      }
    }
  }, {
    key: '_sendMessage',
    value: function _sendMessage(msgObj) {
      var _this3 = this;

      var result = (0, _try3.default)(function () {
        return _this3._rawConn.send(_marsdb.EJSON.stringify(msgObj));
      });
      if (result instanceof Error) {
        this._handleError(result);
      }
    }
  }, {
    key: '_setStatus',
    value: function _setStatus(status, a, b, c) {
      this._status = status;
      this.emit(('status:' + status).toLowerCase(), a, b, c);
    }
  }, {
    key: 'isConnected',
    get: function get() {
      return this._status === CONN_STATUS.CONNECTED;
    }
  }]);

  return DDPConnection;
}(_AsyncEventEmitter3.default);

exports.default = DDPConnection;