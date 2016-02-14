'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CONN_STATUS = undefined;

var _try2 = require('fast.js/function/try');

var _try3 = _interopRequireDefault(_try2);

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

var _HeartbeatManager = require('./HeartbeatManager');

var _HeartbeatManager2 = _interopRequireDefault(_HeartbeatManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = typeof window !== 'undefined' && window.Mars ? window.Mars.EventEmitter : require('marsdb').EventEmitter;
var PromiseQueue = typeof window !== 'undefined' && window.Mars ? window.Mars.PromiseQueue : require('marsdb').PromiseQueue;
var EJSON = typeof window !== 'undefined' && window.Mars ? window.Mars.EJSON : require('marsdb').EJSON;
var Random = typeof window !== 'undefined' && window.Mars ? window.Mars.Random : require('marsdb').Random;

// Status of a DDP connection
var DDP_VERSION = 1;
var HEARTBEAT_INTERVAL = 17500;
var HEARTBEAT_TIMEOUT = 15000;
var RECONNECT_INTERVAL = 5000;
var CONN_STATUS = exports.CONN_STATUS = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED'
};

var DDPConnection = function (_EventEmitter) {
  _inherits(DDPConnection, _EventEmitter);

  function DDPConnection(_ref) {
    var url = _ref.url;
    var _ref$socket = _ref.socket;
    var socket = _ref$socket === undefined ? WebSocket : _ref$socket;
    var _ref$autoReconnect = _ref.autoReconnect;
    var autoReconnect = _ref$autoReconnect === undefined ? true : _ref$autoReconnect;

    _classCallCheck(this, DDPConnection);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(DDPConnection).call(this));

    _this.url = url;
    _this._processQueue = new PromiseQueue(1);
    _this._sessionId = null;
    _this._autoReconnect = autoReconnect;
    _this._socket = socket;
    _this._status = CONN_STATUS.DISCONNECTED;

    _this._heartbeat = new _HeartbeatManager2.default(HEARTBEAT_INTERVAL, HEARTBEAT_TIMEOUT);
    _this._heartbeat.on('timeout', (0, _bind3.default)(_this._handleHearbeatTimeout, _this));
    _this._heartbeat.on('sendPing', (0, _bind3.default)(_this.sendPing, _this));
    _this._heartbeat.on('sendPong', (0, _bind3.default)(_this.sendPong, _this));
    _this.connect();
    return _this;
  }

  /**
   * Returns true if client is fully connected to a server
   * @return {Boolean}
   */

  _createClass(DDPConnection, [{
    key: 'sendMethod',

    /**
     * Sends a "method" message to the server with given
     * parameters
     * @param  {String} name
     * @param  {String} params
     * @param  {String} id
     * @param  {String} randomSeed
     */
    value: function sendMethod(name) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
      var id = arguments[2];
      var randomSeed = arguments[3];

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
    }

    /**
     * Send "sub" message to the server with given
     * publusher name and parameters
     * @param  {String} name
     * @param  {Array} params
     * @param  {String} id
     */

  }, {
    key: 'sendSub',
    value: function sendSub(name) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
      var id = arguments[2];

      this._sendMessage({
        msg: 'sub',
        id: id,
        name: name,
        params: params
      });
    }

    /**
     * Send "unsub" message to the server for given
     * subscription id
     * @param  {String} id
     */

  }, {
    key: 'sendUnsub',
    value: function sendUnsub(id) {
      this._sendMessage({
        msg: 'unsub',
        id: id
      });
    }

    /**
     * Send a "ping" message with randomly generated ping id
     */

  }, {
    key: 'sendPing',
    value: function sendPing() {
      this._sendMessage({
        msg: 'ping',
        id: Random.default().id(20)
      });
    }

    /**
     * Sends a "pong" message for given id of ping message
     * @param  {String} id
     */

  }, {
    key: 'sendPong',
    value: function sendPong(id) {
      this._sendMessage({
        msg: 'pong',
        id: id
      });
    }

    /**
     * Make a new WebSocket connection to the server
     * if we are not connected yet (isDicsonnected).
     * Returns true if connecting, false if already connectiong
     * @returns {Boolean}
     */

  }, {
    key: 'connect',
    value: function connect() {
      if (this.isDisconnected) {
        this._rawConn = new this._socket(this.url);
        this._rawConn.onopen = (0, _bind3.default)(this._handleOpen, this);
        this._rawConn.onerror = (0, _bind3.default)(this._handleError, this);
        this._rawConn.onclose = (0, _bind3.default)(this._handleClose, this);
        this._rawConn.onmessage = (0, _bind3.default)(this._handleRawMessage, this);
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

  }, {
    key: 'reconnect',
    value: function reconnect() {
      var _this2 = this;

      if (this.isDisconnected) {
        clearTimeout(this._reconnTimer);
        this._reconnecting = true;
        this._reconnTimer = setTimeout((0, _bind3.default)(this.connect, this), RECONNECT_INTERVAL);

        return function () {
          clearTimeout(_this2._reconnTimer);
          _this2._reconnecting = false;
          _this2.disconnect();
        };
      }
    }

    /**
     * Close WebSocket connection. If autoReconnect is enabled
     * (enabled by default), then after 5 sec reconnection will
     * be initiated.
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      var _this3 = this;

      (0, _try3.default)(function () {
        return _this3._rawConn && _this3._rawConn.close();
      });
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
        this._reconnecting = false;
      }
    }
  }, {
    key: '_handleClose',
    value: function _handleClose() {
      this._heartbeat._clearTimers();
      this._setStatus(CONN_STATUS.DISCONNECTED);

      if (this._autoReconnect) {
        this._reconnecting = false;
        this.reconnect();
      }
    }
  }, {
    key: '_handleHearbeatTimeout',
    value: function _handleHearbeatTimeout() {
      this.disconnect();
    }
  }, {
    key: '_handleError',
    value: function _handleError(error) {
      this.emit('error', error);
    }
  }, {
    key: '_handleRawMessage',
    value: function _handleRawMessage(rawMsg) {
      var _this4 = this;

      return this._processQueue.add(function () {
        var msgObj = EJSON.parse(rawMsg.data);
        return _this4._processMessage(msgObj);
      }).then(null, function (err) {
        _this4._handleError(err);
      });
    }
  }, {
    key: '_processMessage',
    value: function _processMessage(msg) {
      switch (msg.msg) {
        case 'connected':
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
      var _this5 = this;

      var result = (0, _try3.default)(function () {
        return _this5._rawConn.send(EJSON.stringify(msgObj));
      });
      if (result instanceof Error) {
        this._handleError(result);
      }
    }
  }, {
    key: '_setStatus',
    value: function _setStatus(status, a) {
      this._status = status;
      this.emit(('status:' + status).toLowerCase(), a);
    }
  }, {
    key: 'isConnected',
    get: function get() {
      return this._status === CONN_STATUS.CONNECTED;
    }

    /**
     * Returns true if client disconnected
     * @return {Boolean}
     */

  }, {
    key: 'isDisconnected',
    get: function get() {
      return this._status === CONN_STATUS.DISCONNECTED;
    }
  }]);

  return DDPConnection;
}(EventEmitter);

exports.default = DDPConnection;