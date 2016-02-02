(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.Mars || (g.Mars = {})).Meteor = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCollectionDelegate = createCollectionDelegate;

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _marsdb = require('marsdb');

var _marsdb2 = _interopRequireDefault(_marsdb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function createCollectionDelegate(connection) {
  var _currentDelegateClass = _marsdb2.default.defaultDelegate();

  /**
   * Collection manager is a factory for Mars.Collection
   * objects (one object by collection name).
   * It also syncing client/server changes.
   */

  var CollectionManager = function (_currentDelegateClass2) {
    _inherits(CollectionManager, _currentDelegateClass2);

    function CollectionManager() {
      var _Object$getPrototypeO;

      _classCallCheck(this, CollectionManager);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var _this = _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(CollectionManager)).call.apply(_Object$getPrototypeO, [this].concat(args)));

      connection.on('status:connected', _this._handleConnected.bind(_this));
      connection.on('message:added', _this._handleRemoteAdded.bind(_this));
      connection.on('message:changed', _this._handleRemoteChanged.bind(_this));
      connection.on('message:removed', _this._handleRemoteRemoved.bind(_this));
      return _this;
    }

    _createClass(CollectionManager, [{
      key: 'insert',
      value: function insert(doc) {
        var _this2 = this;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var randomId = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var localInsert = _get(Object.getPrototypeOf(CollectionManager.prototype), 'insert', this).call(this, doc, options, randomId);

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/insert';
          connection.methodManager.apply(methodName, [doc, options], randomId.seed).result().then(null, function (e) {
            return localInsert.then(function () {
              return _this2.db.remove(doc._id, { quiet: true });
            }).then(function () {
              throw e;
            });
          });
        }

        return localInsert;
      }
    }, {
      key: 'remove',
      value: function remove(query) {
        var _this3 = this;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var localRemove = _get(Object.getPrototypeOf(CollectionManager.prototype), 'remove', this).call(this, query, options);

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/remove';
          connection.methodManager.apply(methodName, [query, options]).result().then(null, function (e) {
            return localRemove.then(function (removedDocs) {
              return _this3.db.insertAll(removedDocs, { quiet: true });
            }).then(function () {
              throw e;
            });
          });
        }

        return localRemove;
      }
    }, {
      key: 'update',
      value: function update(query, modifier) {
        var _this4 = this;

        var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var localUpdate = _get(Object.getPrototypeOf(CollectionManager.prototype), 'update', this).call(this, query, modifier, options);

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/update';
          connection.methodManager.apply(methodName, [query, modifier, options]).result().then(null, function (e) {
            return localUpdate.then(function (res) {
              return _this4.db.insertAll(res.original.filter(function (d) {
                return d;
              }), { quiet: true });
            }).then(function () {
              throw e;
            });
          });
        }

        return localUpdate;
      }
    }, {
      key: '_handleRemoteAdded',
      value: function _handleRemoteAdded(msg) {
        var _this5 = this;

        this.db.ids(msg.id).then(function (ids) {
          if (ids.length) {
            return _this5.db.update(msg.id, msg.fields, { quiet: true });
          } else {
            var doc = _extends({ id: msg.id }, msg.fields);
            return _this5.db.insert(doc, { quiet: true });
          }
        });
      }
    }, {
      key: '_handleRemoteChanged',
      value: function _handleRemoteChanged(msg) {
        var modifier = {};
        if (Array.isArray(msg.cleared) && msg.cleared.length > 0) {
          modifier.$unset = {};
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = msg.cleared[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var f = _step.value;

              modifier.$unset[f] = 1;
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
        if (msg.fields) {
          modifier.$set = {};
          (0, _forEach2.default)(msg.fields, function (v, k) {
            modifier.$set[k] = v;
          });
        }

        return this.db.update(msg.id, modifier, { quiet: true });
      }
    }, {
      key: '_handleRemoteRemoved',
      value: function _handleRemoteRemoved(msg) {
        return this.db.remove(msg.id, { quiet: true });
      }
    }, {
      key: '_handleConnected',
      value: function _handleConnected(reconnected) {
        // TODO sync all collections with backend
      }
    }]);

    return CollectionManager;
  }(_currentDelegateClass);

  return CollectionManager;
}
},{"fast.js/forEach":12,"marsdb":undefined}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCursorWithSub = createCursorWithSub;

var _marsdb = require('marsdb');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function createCursorWithSub(connection) {
  var _currentCursorClass = _marsdb.Collection.defaultCursor();

  /**
   * Cursor that automatically subscribe and unsubscribe
   * on cursor observing statred/stopped.
   */

  var CursorWithSub = function (_currentCursorClass2) {
    _inherits(CursorWithSub, _currentCursorClass2);

    function CursorWithSub() {
      _classCallCheck(this, CursorWithSub);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(CursorWithSub).apply(this, arguments));
    }

    _createClass(CursorWithSub, [{
      key: '_doUpdate',
      value: function _doUpdate() {
        var _this2 = this;

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        var sub = this.options.sub;

        if (!this._subscription && sub) {
          var _connection$subManage;

          this._subscription = (_connection$subManage = connection.subManager).subscribe.apply(_connection$subManage, _toConsumableArray(sub));

          this.once('observeStopped', function () {
            _this2._subscription.stop();
            delete _this2._subscription;
          });

          return this._subscription.ready().then(function () {
            var _get2;

            return (_get2 = _get(Object.getPrototypeOf(CursorWithSub.prototype), '_doUpdate', _this2)).call.apply(_get2, [_this2].concat(args));
          });
        } else {
          var _get3;

          return (_get3 = _get(Object.getPrototypeOf(CursorWithSub.prototype), '_doUpdate', this)).call.apply(_get3, [this].concat(args));
        }
      }
    }]);

    return CursorWithSub;
  }(_currentCursorClass);

  return CursorWithSub;
}
},{"marsdb":undefined}],3:[function(require,module,exports){
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
},{"fast.js/function/bind":15,"fast.js/function/try":17,"marsdb":undefined,"marsdb-sync-server/dist/HeartbeatManager":22,"marsdb/dist/AsyncEventEmitter":23,"marsdb/dist/PromiseQueue":24}],4:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _marsdb = require('marsdb');

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Class for tracking method call status.
 */

var MethodCall = function (_EventEmitter) {
  _inherits(MethodCall, _EventEmitter);

  function MethodCall(method, params, randomSeed, connection) {
    _classCallCheck(this, MethodCall);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MethodCall).call(this));

    _this.id = connection.sendMethod(method, params, randomSeed);
    return _this;
  }

  _createClass(MethodCall, [{
    key: 'result',
    value: function result() {
      var _this2 = this;

      return this._promiseMixed(new Promise(function (resolve, reject) {
        _this2.once('result', resolve);
        _this2.once('error', reject);
      }));
    }
  }, {
    key: 'updated',
    value: function updated() {
      var _this3 = this;

      return this._promiseMixed(new Promise(function (resolve, reject) {
        _this3.once('updated', resolve);
      }));
    }
  }, {
    key: '_promiseMixed',
    value: function _promiseMixed(promise) {
      var _this4 = this;

      return {
        result: this.result.bind(this),
        updated: this.updated.bind(this),
        then: function then() {
          return _this4._promiseMixed(promise.then.apply(promise, arguments));
        }
      };
    }
  }, {
    key: '_handleResultMessage',
    value: function _handleResultMessage(msg) {
      this._result = true;
      if (msg.id == this.id) {
        if (msg.error) {
          this.emit('error', msg.error);
        } else {
          this.emit('result', msg.result);
        }
      }
    }
  }, {
    key: '_handleUpdatedMessage',
    value: function _handleUpdatedMessage(msg) {
      this._updated = true;
      this.emit('updated');
    }
  }]);

  return MethodCall;
}(_marsdb.EventEmitter);

/**
 * Make an RPC calls and track results.
 * Track a DDP connection for canceling active
 * methods calls.
 */

var MethodCallManager = function () {
  function MethodCallManager(connection) {
    _classCallCheck(this, MethodCallManager);

    this.conn = connection;
    this._methods = {};

    connection.on('status:disconnected', this._handleDisconnected.bind(this));
    connection.on('message:result', this._handleMethodResult.bind(this));
    connection.on('message:updated', this._handleMethodUpdated.bind(this));
  }

  /**
   * Call a Meteor method
   * @param  {String} method
   * @param  {...}    param1, param2, ..
   * @return {MethodCall}
   */

  _createClass(MethodCallManager, [{
    key: 'call',
    value: function call(method) {
      for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        params[_key - 1] = arguments[_key];
      }

      return this.apply(method, params);
    }

    /**
     * Apply a method with given parameters and
     * randomSeed
     * @param  {String} method
     * @param  {Array} params
     * @param  {String} randomSeed
     * @return {MethodCall}
     */

  }, {
    key: 'apply',
    value: function apply(method, params, randomSeed) {
      var _this5 = this;

      (0, _invariant2.default)(typeof method === 'string', 'Method name must be a string, but given type is %s', typeof method === 'undefined' ? 'undefined' : _typeof(method));

      (0, _invariant2.default)(!params || Array.isArray(params), 'Params must be an array or undefined, but given type is %s', typeof params === 'undefined' ? 'undefined' : _typeof(params));

      var call = new MethodCall(method, params, randomSeed, this.conn);
      this._methods[call.id] = call;

      var cleanupCallback = function cleanupCallback() {
        if (_this5._methods[call.id] && _this5._methods[call.id]._result && _this5._methods[call.id]._updated) {
          delete _this5._methods[call.id];
        }
      };
      call.result().then(cleanupCallback).updated().then(cleanupCallback);

      return call;
    }
  }, {
    key: '_handleMethodResult',
    value: function _handleMethodResult(msg) {
      if (msg.id && this._methods[msg.id]) {
        this._methods[msg.id]._handleResultMessage(msg);
      }
    }
  }, {
    key: '_handleMethodUpdated',
    value: function _handleMethodUpdated(msg) {
      var _this6 = this;

      (0, _forEach2.default)(msg.methods, function (mid) {
        if (_this6._methods[mid]) {
          _this6._methods[mid]._handleUpdatedMessage(msg);
        }
      });
    }
  }, {
    key: '_handleDisconnected',
    value: function _handleDisconnected() {
      (0, _forEach2.default)(this._methods, function (methodCall) {
        methodCall._handleResultMessage({
          error: new Error('Disconnected, method can\'t be done')
        });
      });
      this._methods = {};
    }
  }]);

  return MethodCallManager;
}();

exports.default = MethodCallManager;
},{"fast.js/forEach":12,"invariant":21,"marsdb":undefined}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SUB_STATUS = undefined;

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _marsdb = require('marsdb');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Utils
function _getArgumentsHash() {
  var args = Array.prototype.slice.call(arguments);
  return JSON.stringify(args);
}

// Status of the subsctiption
var STOP_PENDING_TIMEOUT = 15000;
var SUB_STATUS = exports.SUB_STATUS = {
  READY_PENDING: 'READY_PENDING',
  READY: 'READY',
  ERROR: 'ERROR',
  STOP_PENDING: 'STOP_PENDING',
  STOPPED: 'STOPPED',
  FROZEN: 'FROZEN'
};

/**
 * Class for storing Subscription with
 * delayed pending feature.
 */

var Subscription = function (_EventEmitter) {
  _inherits(Subscription, _EventEmitter);

  function Subscription(name, params, hash, conn) {
    _classCallCheck(this, Subscription);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Subscription).call(this));

    _this.name = name;
    _this.params = params;
    _this.hash = hash;
    _this.id = hash;
    _this.conn = conn;
    _this._ready = false;
    return _this;
  }

  _createClass(Subscription, [{
    key: 'ready',
    value: function ready() {
      var _this2 = this;

      return this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this2.isReady) {
          resolve();
        } else {
          _this2.once(SUB_STATUS.READY, resolve);
        }
      }));
    }
  }, {
    key: 'stopped',
    value: function stopped() {
      var _this3 = this;

      return this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this3.isStopped) {
          resolve();
        } else {
          _this3.once(SUB_STATUS.STOPPED, resolve);
        }
      }));
    }
  }, {
    key: 'faulted',
    value: function faulted() {
      var _this4 = this;

      return this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this4.isFaulted) {
          resolve();
        } else {
          _this4.once(SUB_STATUS.ERROR, resolve);
        }
      }));
    }
  }, {
    key: 'stop',
    value: function stop() {
      this._scheduleStop();
    }
  }, {
    key: '_promiseMixed',
    value: function _promiseMixed(promise) {
      var _this5 = this;

      return {
        stopped: this.stopped.bind(this),
        ready: this.ready.bind(this),
        faulted: this.faulted.bind(this),
        then: function then() {
          return _this5._promiseMixed(promise.then.apply(promise, arguments));
        }
      };
    }
  }, {
    key: '_subscribe',
    value: function _subscribe(options) {
      if (!this.status || this.status === SUB_STATUS.STOP_PENDING || this.status === SUB_STATUS.ERROR || this.status === SUB_STATUS.FROZEN) {
        if (this.status === SUB_STATUS.STOP_PENDING) {
          if (this._ready) {
            this._clearStopper();
            this._setStatus(SUB_STATUS.READY);
          } else {
            this._setStatus(SUB_STATUS.READY_PENDING);
          }
        } else if (!options || !options.dontSubFrozen || this.status !== SUB_STATUS.FROZEN) {
          this._setStatus(SUB_STATUS.READY_PENDING);
          this.id = this.conn.sendSub(this.name, this.params);
        }
      }
      return this.id;
    }
  }, {
    key: '_scheduleStop',
    value: function _scheduleStop() {
      var _this6 = this;

      if ((this.status === SUB_STATUS.READY_PENDING || this.status === SUB_STATUS.READY) && this.status !== SUB_STATUS.STOP_PENDING) {
        this._setStatus(SUB_STATUS.STOP_PENDING);
        this._stopTimer = setTimeout(function () {
          return _this6._stopImmediately();
        }, STOP_PENDING_TIMEOUT);
      }
    }
  }, {
    key: '_stopImmediately',
    value: function _stopImmediately(options) {
      if (this.status !== SUB_STATUS.STOPPED) {
        this._clearStopper();
        this._setStatus(SUB_STATUS.STOPPED);

        if (!options || !options.dontSendMsg) {
          this.conn.sendUnsub(this.id);
        }
      }
    }
  }, {
    key: '_freeze',
    value: function _freeze() {
      if (this.status === SUB_STATUS.STOP_PENDING) {
        this._stopImmediately({ dontSendMsg: true });
      } else if (!this.status || this.status !== SUB_STATUS.STOPPED) {
        this._setStatus(SUB_STATUS.FROZEN);
      }
    }
  }, {
    key: '_handleNosubMessage',
    value: function _handleNosubMessage(msg) {
      this._clearStopper();
      if (msg.error) {
        this._setStatus(SUB_STATUS.ERROR, msg.error);
      } else {
        this._stopImmediately({ dontSendMsg: true });
      }
    }
  }, {
    key: '_handleReadyMessage',
    value: function _handleReadyMessage(msg) {
      this._ready = true;
      if (this.status !== SUB_STATUS.STOPPED && this.status !== SUB_STATUS.STOP_PENDING) {
        this._setStatus(SUB_STATUS.READY);
      }
    }
  }, {
    key: '_setStatus',
    value: function _setStatus(status, a, b, c, d) {
      this.status = status;
      this.emit(status, a, b, c, d);
    }
  }, {
    key: '_clearStopper',
    value: function _clearStopper() {
      clearTimeout(this._stopTimer);
      this._stopTimer = null;
    }
  }, {
    key: 'isReady',
    get: function get() {
      return this.status == SUB_STATUS.READY || this.status === SUB_STATUS.FROZEN && this._ready;
    }
  }, {
    key: 'isStopped',
    get: function get() {
      return this.status === SUB_STATUS.STOPPED;
    }
  }, {
    key: 'isFaulted',
    get: function get() {
      return this.status === SUB_STATUS.ERROR;
    }
  }, {
    key: 'isFrozen',
    get: function get() {
      return this.status == SUB_STATUS.FROZEN;
    }
  }]);

  return Subscription;
}(_marsdb.EventEmitter);

/**
 * The manager tracks all subscriptions on the application
 * and make reaction on some life-cycle events, like stop
 * subscription.
 */

var SubscriptionManager = function (_EventEmitter2) {
  _inherits(SubscriptionManager, _EventEmitter2);

  // @ngInject

  function SubscriptionManager(connection) {
    _classCallCheck(this, SubscriptionManager);

    var _this7 = _possibleConstructorReturn(this, Object.getPrototypeOf(SubscriptionManager).call(this));

    _this7.subscriptionsByHash = {};
    _this7.subscriptionsById = {};
    _this7.loadingSet = new Set();
    _this7.conn = connection;

    connection.on('status:connected', _this7._handleConnected.bind(_this7));
    connection.on('status:disconnected', _this7._handleDisconnected.bind(_this7));
    connection.on('message:ready', _this7._handleSubscriptionReady.bind(_this7));
    connection.on('message:nosub', _this7._handleSubscriptionNosub.bind(_this7));
    return _this7;
  }

  _createClass(SubscriptionManager, [{
    key: 'subscribe',
    value: function subscribe(name) {
      for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        params[_key - 1] = arguments[_key];
      }

      var subHash = _getArgumentsHash.apply(null, arguments);
      var sub = this.subscriptionsByHash[subHash];

      if (!sub) {
        sub = new Subscription(name, params, subHash, this.conn);
        if (this.conn.isConnected) {
          sub._subscribe();
        } else {
          sub._freeze();
        }
        this._registerSub(sub);
      } else {
        sub._subscribe({ dontSubFrozen: true });
      }

      if (!sub.isReady) {
        this._trackLoadingStart(sub.id);
      }

      return sub;
    }
  }, {
    key: '_registerSub',
    value: function _registerSub(sub) {
      var _this8 = this;

      this.subscriptionsByHash[sub.hash] = sub;
      this.subscriptionsById[sub.id] = sub;

      var cleanupCallback = function cleanupCallback() {
        delete _this8.subscriptionsByHash[sub.hash];
        delete _this8.subscriptionsById[sub.id];
        _this8._trackLoadingReady(sub.id);
      };

      sub.stopped().then(cleanupCallback).faulted().then(cleanupCallback);
    }
  }, {
    key: '_handleConnected',
    value: function _handleConnected(reconnected) {
      var _this9 = this;

      (0, _forEach2.default)(this.subscriptionsById, function (sub, sid) {
        var newId = sub._subscribe();
        if (newId !== sid) {
          _this9._trackLoadingReady(sid);
          _this9._trackLoadingStart(newId);
          delete _this9.subscriptionsById[sid];
          _this9.subscriptionsById[newId] = sub;
        }
      });
    }
  }, {
    key: '_handleDisconnected',
    value: function _handleDisconnected() {
      var _this10 = this;

      (0, _forEach2.default)(this.subscriptionsById, function (sub, sid) {
        sub._freeze();
        if (sub.isFrozen) {
          _this10._trackLoadingStart(sid);
        }
      });
    }
  }, {
    key: '_handleSubscriptionReady',
    value: function _handleSubscriptionReady(msg) {
      var _this11 = this;

      (0, _forEach2.default)(msg.subs, function (sid) {
        var sub = _this11.subscriptionsById[sid];
        if (sub) {
          sub._handleReadyMessage(msg);
          _this11._trackLoadingReady(sid);
        }
      });
    }
  }, {
    key: '_handleSubscriptionNosub',
    value: function _handleSubscriptionNosub(msg) {
      var sub = this.subscriptionsById[msg.id];
      if (msg.id && sub) {
        sub._handleNosubMessage(msg);
      }
    }
  }, {
    key: '_trackLoadingStart',
    value: function _trackLoadingStart(subId) {
      var prevSize = this.loadingSet.size;
      this.loadingSet.add(subId);
      if (prevSize === 0 && this.loadingSet.size > 0) {
        this.emit('loading');
      }
    }
  }, {
    key: '_trackLoadingReady',
    value: function _trackLoadingReady(subId) {
      var prevSize = this.loadingSet.size;
      this.loadingSet.delete(subId);
      if (prevSize > 0 && this.loadingSet.size === 0) {
        this.emit('ready');
      }
    }
  }]);

  return SubscriptionManager;
}(_marsdb.EventEmitter);

exports.default = SubscriptionManager;
},{"fast.js/forEach":12,"marsdb":undefined}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getConnection = getConnection;
exports.call = call;
exports.apply = apply;
exports.subscribe = subscribe;
exports.configure = configure;

var _map2 = require('fast.js/map');

var _map3 = _interopRequireDefault(_map2);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _marsdb = require('marsdb');

var _marsdb2 = _interopRequireDefault(_marsdb);

var _DDPConnection = require('./DDPConnection');

var _DDPConnection2 = _interopRequireDefault(_DDPConnection);

var _SubscriptionManager = require('./SubscriptionManager');

var _SubscriptionManager2 = _interopRequireDefault(_SubscriptionManager);

var _MethodCallManager = require('./MethodCallManager');

var _MethodCallManager2 = _interopRequireDefault(_MethodCallManager);

var _CollectionManager = require('./CollectionManager');

var _CursorWithSub = require('./CursorWithSub');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Internals
var _connection = null;

function getConnection() {
  return _connection;
}

function call() {
  var _connection$methodMan;

  (_connection$methodMan = _connection.methodManager).call.apply(_connection$methodMan, arguments);
}

function apply() {
  var _connection$methodMan2;

  (_connection$methodMan2 = _connection.methodManager).apply.apply(_connection$methodMan2, arguments);
}

function subscribe() {
  var _connection$subManage;

  (_connection$subManage = _connection.subManager).subscribe.apply(_connection$subManage, arguments);
}

function configure(_ref) {
  var url = _ref.url;
  var _ref$managers = _ref.managers;
  var managers = _ref$managers === undefined ? [] : _ref$managers;
  var _ref$socket = _ref.socket;
  var socket = _ref$socket === undefined ? WebSocket : _ref$socket;

  (0, _invariant2.default)(!_connection, 'configure(...): connection already configured');

  _connection = new _DDPConnection2.default(url, socket);
  _connection.subManager = new _SubscriptionManager2.default(_connection);
  _connection.methodManager = new _MethodCallManager2.default(_connection);
  _connection.customManagers = (0, _map3.default)(managers, function (x) {
    return new x(_connection);
  });
  _marsdb2.default.defaultDelegate((0, _CollectionManager.createCollectionDelegate)(_connection));
  _marsdb2.default.defaultCursor((0, _CursorWithSub.createCursorWithSub)(_connection));
  return _connection;
}
},{"./CollectionManager":1,"./CursorWithSub":2,"./DDPConnection":3,"./MethodCallManager":4,"./SubscriptionManager":5,"fast.js/map":18,"invariant":21,"marsdb":undefined}],7:[function(require,module,exports){
const client = require('./dist');
module.exports = {
  configure: client.configure,
  apply: client.apply,
  call: client.call,
  subscribe: client.subsctibe,
};

},{"./dist":6}],8:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
function Deque(capacity) {
    this._capacity = getCapacity(capacity);
    this._length = 0;
    this._front = 0;
    this._makeCapacity();
    if (isArray(capacity)) {
        var len = capacity.length;
        for (var i = 0; i < len; ++i) {
            this[i] = capacity[i];
        }
        this._length = len;
    }
}

Deque.prototype.toArray = function Deque$toArray() {
    var len = this._length;
    var ret = new Array(len);
    var front = this._front;
    var capacity = this._capacity;
    for (var j = 0; j < len; ++j) {
        ret[j] = this[(front + j) & (capacity - 1)];
    }
    return ret;
};

Deque.prototype.push = function Deque$push(item) {
    var argsLength = arguments.length;
    var length = this._length;
    if (argsLength > 1) {
        var capacity = this._capacity;
        if (length + argsLength > capacity) {
            for (var i = 0; i < argsLength; ++i) {
                this._checkCapacity(length + 1);
                var j = (this._front + length) & (this._capacity - 1);
                this[j] = arguments[i];
                length++;
                this._length = length;
            }
            return length;
        }
        else {
            var j = this._front;
            for (var i = 0; i < argsLength; ++i) {
                this[(j + length) & (capacity - 1)] = arguments[i];
                j++;
            }
            this._length = length + argsLength;
            return length + argsLength;
        }

    }

    if (argsLength === 0) return length;

    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = item;
    this._length = length + 1;
    return length + 1;
};

Deque.prototype.pop = function Deque$pop() {
    var length = this._length;
    if (length === 0) {
        return void 0;
    }
    var i = (this._front + length - 1) & (this._capacity - 1);
    var ret = this[i];
    this[i] = void 0;
    this._length = length - 1;
    return ret;
};

Deque.prototype.shift = function Deque$shift() {
    var length = this._length;
    if (length === 0) {
        return void 0;
    }
    var front = this._front;
    var ret = this[front];
    this[front] = void 0;
    this._front = (front + 1) & (this._capacity - 1);
    this._length = length - 1;
    return ret;
};

Deque.prototype.unshift = function Deque$unshift(item) {
    var length = this._length;
    var argsLength = arguments.length;


    if (argsLength > 1) {
        var capacity = this._capacity;
        if (length + argsLength > capacity) {
            for (var i = argsLength - 1; i >= 0; i--) {
                this._checkCapacity(length + 1);
                var capacity = this._capacity;
                var j = (((( this._front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
                this[j] = arguments[i];
                length++;
                this._length = length;
                this._front = j;
            }
            return length;
        }
        else {
            var front = this._front;
            for (var i = argsLength - 1; i >= 0; i--) {
                var j = (((( front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
                this[j] = arguments[i];
                front = j;
            }
            this._front = front;
            this._length = length + argsLength;
            return length + argsLength;
        }
    }

    if (argsLength === 0) return length;

    this._checkCapacity(length + 1);
    var capacity = this._capacity;
    var i = (((( this._front - 1 ) &
        ( capacity - 1) ) ^ capacity ) - capacity );
    this[i] = item;
    this._length = length + 1;
    this._front = i;
    return length + 1;
};

Deque.prototype.peekBack = function Deque$peekBack() {
    var length = this._length;
    if (length === 0) {
        return void 0;
    }
    var index = (this._front + length - 1) & (this._capacity - 1);
    return this[index];
};

Deque.prototype.peekFront = function Deque$peekFront() {
    if (this._length === 0) {
        return void 0;
    }
    return this[this._front];
};

Deque.prototype.get = function Deque$get(index) {
    var i = index;
    if ((i !== (i | 0))) {
        return void 0;
    }
    var len = this._length;
    if (i < 0) {
        i = i + len;
    }
    if (i < 0 || i >= len) {
        return void 0;
    }
    return this[(this._front + i) & (this._capacity - 1)];
};

Deque.prototype.isEmpty = function Deque$isEmpty() {
    return this._length === 0;
};

Deque.prototype.clear = function Deque$clear() {
    this._length = 0;
    this._front = 0;
    this._makeCapacity();
};

Deque.prototype.toString = function Deque$toString() {
    return this.toArray().toString();
};

Deque.prototype.valueOf = Deque.prototype.toString;
Deque.prototype.removeFront = Deque.prototype.shift;
Deque.prototype.removeBack = Deque.prototype.pop;
Deque.prototype.insertFront = Deque.prototype.unshift;
Deque.prototype.insertBack = Deque.prototype.push;
Deque.prototype.enqueue = Deque.prototype.push;
Deque.prototype.dequeue = Deque.prototype.shift;
Deque.prototype.toJSON = Deque.prototype.toArray;

Object.defineProperty(Deque.prototype, "length", {
    get: function() {
        return this._length;
    },
    set: function() {
        throw new RangeError("");
    }
});

Deque.prototype._makeCapacity = function Deque$_makeCapacity() {
    var len = this._capacity;
    for (var i = 0; i < len; ++i) {
        this[i] = void 0;
    }
};

Deque.prototype._checkCapacity = function Deque$_checkCapacity(size) {
    if (this._capacity < size) {
        this._resizeTo(getCapacity(this._capacity * 1.5 + 16));
    }
};

Deque.prototype._resizeTo = function Deque$_resizeTo(capacity) {
    var oldFront = this._front;
    var oldCapacity = this._capacity;
    var oldDeque = new Array(oldCapacity);
    var length = this._length;

    arrayCopy(this, 0, oldDeque, 0, oldCapacity);
    this._capacity = capacity;
    this._makeCapacity();
    this._front = 0;
    if (oldFront + length <= oldCapacity) {
        arrayCopy(oldDeque, oldFront, this, 0, length);
    } else {        var lengthBeforeWrapping =
            length - ((oldFront + length) & (oldCapacity - 1));

        arrayCopy(oldDeque, oldFront, this, 0, lengthBeforeWrapping);
        arrayCopy(oldDeque, 0, this, lengthBeforeWrapping,
            length - lengthBeforeWrapping);
    }
};


var isArray = Array.isArray;

function arrayCopy(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
    }
}

function pow2AtLeast(n) {
    n = n >>> 0;
    n = n - 1;
    n = n | (n >> 1);
    n = n | (n >> 2);
    n = n | (n >> 4);
    n = n | (n >> 8);
    n = n | (n >> 16);
    return n + 1;
}

function getCapacity(capacity) {
    if (typeof capacity !== "number") {
        if (isArray(capacity)) {
            capacity = capacity.length;
        }
        else {
            return 16;
        }
    }
    return pow2AtLeast(
        Math.min(
            Math.max(16, capacity), 1073741824)
    );
}

module.exports = Deque;

},{}],9:[function(require,module,exports){
'use strict';

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} once Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Holds the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],10:[function(require,module,exports){
'use strict';

var bindInternal3 = require('../function/bindInternal3');

/**
 * # For Each
 *
 * A fast `.forEach()` implementation.
 *
 * @param  {Array}    subject     The array (or array-like) to iterate over.
 * @param  {Function} fn          The visitor function.
 * @param  {Object}   thisContext The context for the visitor.
 */
module.exports = function fastForEach (subject, fn, thisContext) {
  var length = subject.length,
      iterator = thisContext !== undefined ? bindInternal3(fn, thisContext) : fn,
      i;
  for (i = 0; i < length; i++) {
    iterator(subject[i], i, subject);
  }
};

},{"../function/bindInternal3":16}],11:[function(require,module,exports){
'use strict';

var bindInternal3 = require('../function/bindInternal3');

/**
 * # Map
 *
 * A fast `.map()` implementation.
 *
 * @param  {Array}    subject     The array (or array-like) to map over.
 * @param  {Function} fn          The mapper function.
 * @param  {Object}   thisContext The context for the mapper.
 * @return {Array}                The array containing the results.
 */
module.exports = function fastMap (subject, fn, thisContext) {
  var length = subject.length,
      result = new Array(length),
      iterator = thisContext !== undefined ? bindInternal3(fn, thisContext) : fn,
      i;
  for (i = 0; i < length; i++) {
    result[i] = iterator(subject[i], i, subject);
  }
  return result;
};

},{"../function/bindInternal3":16}],12:[function(require,module,exports){
'use strict';

var forEachArray = require('./array/forEach'),
    forEachObject = require('./object/forEach');

/**
 * # ForEach
 *
 * A fast `.forEach()` implementation.
 *
 * @param  {Array|Object} subject     The array or object to iterate over.
 * @param  {Function}     fn          The visitor function.
 * @param  {Object}       thisContext The context for the visitor.
 */
module.exports = function fastForEach (subject, fn, thisContext) {
  if (subject instanceof Array) {
    return forEachArray(subject, fn, thisContext);
  }
  else {
    return forEachObject(subject, fn, thisContext);
  }
};
},{"./array/forEach":10,"./object/forEach":19}],13:[function(require,module,exports){
'use strict';

/**
 * Internal helper for applying a function without a context.
 */
module.exports = function applyNoContext (subject, args) {
  switch (args.length) {
    case 0:
      return subject();
    case 1:
      return subject(args[0]);
    case 2:
      return subject(args[0], args[1]);
    case 3:
      return subject(args[0], args[1], args[2]);
    case 4:
      return subject(args[0], args[1], args[2], args[3]);
    case 5:
      return subject(args[0], args[1], args[2], args[3], args[4]);
    case 6:
      return subject(args[0], args[1], args[2], args[3], args[4], args[5]);
    case 7:
      return subject(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    case 8:
      return subject(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    default:
      return subject.apply(undefined, args);
  }
};

},{}],14:[function(require,module,exports){
'use strict';

/**
 * Internal helper for applying a function with a context.
 */
module.exports = function applyWithContext (subject, thisContext, args) {
  switch (args.length) {
    case 0:
      return subject.call(thisContext);
    case 1:
      return subject.call(thisContext, args[0]);
    case 2:
      return subject.call(thisContext, args[0], args[1]);
    case 3:
      return subject.call(thisContext, args[0], args[1], args[2]);
    case 4:
      return subject.call(thisContext, args[0], args[1], args[2], args[3]);
    case 5:
      return subject.call(thisContext, args[0], args[1], args[2], args[3], args[4]);
    case 6:
      return subject.call(thisContext, args[0], args[1], args[2], args[3], args[4], args[5]);
    case 7:
      return subject.call(thisContext, args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    case 8:
      return subject.call(thisContext, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    default:
      return subject.apply(thisContext, args);
  }
};

},{}],15:[function(require,module,exports){
'use strict';

var applyWithContext = require('./applyWithContext');
var applyNoContext = require('./applyNoContext');

/**
 * # Bind
 * Analogue of `Function::bind()`.
 *
 * ```js
 * var bind = require('fast.js').bind;
 * var bound = bind(myfunc, this, 1, 2, 3);
 *
 * bound(4);
 * ```
 *
 *
 * @param  {Function} fn          The function which should be bound.
 * @param  {Object}   thisContext The context to bind the function to.
 * @param  {mixed}    args, ...   Additional arguments to pre-bind.
 * @return {Function}             The bound function.
 */
module.exports = function fastBind (fn, thisContext) {
  var boundLength = arguments.length - 2,
      boundArgs;

  if (boundLength > 0) {
    boundArgs = new Array(boundLength);
    for (var i = 0; i < boundLength; i++) {
      boundArgs[i] = arguments[i + 2];
    }
    if (thisContext !== undefined) {
      return function () {
        var length = arguments.length,
            args = new Array(boundLength + length),
            i;
        for (i = 0; i < boundLength; i++) {
          args[i] = boundArgs[i];
        }
        for (i = 0; i < length; i++) {
          args[boundLength + i] = arguments[i];
        }
        return applyWithContext(fn, thisContext, args);
      };
    }
    else {
      return function () {
        var length = arguments.length,
            args = new Array(boundLength + length),
            i;
        for (i = 0; i < boundLength; i++) {
          args[i] = boundArgs[i];
        }
        for (i = 0; i < length; i++) {
          args[boundLength + i] = arguments[i];
        }
        return applyNoContext(fn, args);
      };
    }
  }
  if (thisContext !== undefined) {
    return function () {
      return applyWithContext(fn, thisContext, arguments);
    };
  }
  else {
    return function () {
      return applyNoContext(fn, arguments);
    };
  }
};

},{"./applyNoContext":13,"./applyWithContext":14}],16:[function(require,module,exports){
'use strict';

/**
 * Internal helper to bind a function known to have 3 arguments
 * to a given context.
 */
module.exports = function bindInternal3 (func, thisContext) {
  return function (a, b, c) {
    return func.call(thisContext, a, b, c);
  };
};

},{}],17:[function(require,module,exports){
'use strict';

/**
 * # Try
 *
 * Allows functions to be optimised by isolating `try {} catch (e) {}` blocks
 * outside the function declaration. Returns either the result of the function or an Error
 * object if one was thrown. The caller should then check for `result instanceof Error`.
 *
 * ```js
 * var result = fast.try(myFunction);
 * if (result instanceof Error) {
 *    console.log('something went wrong');
 * }
 * else {
 *   console.log('result:', result);
 * }
 * ```
 *
 * @param  {Function} fn The function to invoke.
 * @return {mixed}       The result of the function, or an `Error` object.
 */
module.exports = function fastTry (fn) {
  try {
    return fn();
  }
  catch (e) {
    if (!(e instanceof Error)) {
      return new Error(e);
    }
    else {
      return e;
    }
  }
};

},{}],18:[function(require,module,exports){
'use strict';

var mapArray = require('./array/map'),
    mapObject = require('./object/map');

/**
 * # Map
 *
 * A fast `.map()` implementation.
 *
 * @param  {Array|Object} subject     The array or object to map over.
 * @param  {Function}     fn          The mapper function.
 * @param  {Object}       thisContext The context for the mapper.
 * @return {Array|Object}             The array or object containing the results.
 */
module.exports = function fastMap (subject, fn, thisContext) {
  if (subject instanceof Array) {
    return mapArray(subject, fn, thisContext);
  }
  else {
    return mapObject(subject, fn, thisContext);
  }
};
},{"./array/map":11,"./object/map":20}],19:[function(require,module,exports){
'use strict';

var bindInternal3 = require('../function/bindInternal3');

/**
 * # For Each
 *
 * A fast object `.forEach()` implementation.
 *
 * @param  {Object}   subject     The object to iterate over.
 * @param  {Function} fn          The visitor function.
 * @param  {Object}   thisContext The context for the visitor.
 */
module.exports = function fastForEachObject (subject, fn, thisContext) {
  var keys = Object.keys(subject),
      length = keys.length,
      iterator = thisContext !== undefined ? bindInternal3(fn, thisContext) : fn,
      key, i;
  for (i = 0; i < length; i++) {
    key = keys[i];
    iterator(subject[key], key, subject);
  }
};

},{"../function/bindInternal3":16}],20:[function(require,module,exports){
'use strict';

var bindInternal3 = require('../function/bindInternal3');

/**
 * # Map
 *
 * A fast object `.map()` implementation.
 *
 * @param  {Object}   subject     The object to map over.
 * @param  {Function} fn          The mapper function.
 * @param  {Object}   thisContext The context for the mapper.
 * @return {Object}               The new object containing the results.
 */
module.exports = function fastMapObject (subject, fn, thisContext) {
  var keys = Object.keys(subject),
      length = keys.length,
      result = {},
      iterator = thisContext !== undefined ? bindInternal3(fn, thisContext) : fn,
      i, key;
  for (i = 0; i < length; i++) {
    key = keys[i];
    result[key] = iterator(subject[key], key, subject);
  }
  return result;
};

},{"../function/bindInternal3":16}],21:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if ("production" !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

},{}],22:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _AsyncEventEmitter2 = require('marsdb/dist/AsyncEventEmitter');

var _AsyncEventEmitter3 = _interopRequireDefault(_AsyncEventEmitter2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Manages a heartbeat with a client
 */

var HeartbeatManager = function (_AsyncEventEmitter) {
  _inherits(HeartbeatManager, _AsyncEventEmitter);

  function HeartbeatManager() {
    var pingTimeout = arguments.length <= 0 || arguments[0] === undefined ? 17500 : arguments[0];
    var pongTimeout = arguments.length <= 1 || arguments[1] === undefined ? 10000 : arguments[1];

    _classCallCheck(this, HeartbeatManager);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(HeartbeatManager).call(this));

    _this.pingTimeout = pingTimeout;
    _this.pongTimeout = pongTimeout;
    return _this;
  }

  _createClass(HeartbeatManager, [{
    key: 'waitPing',
    value: function waitPing() {
      var _this2 = this;

      this._clearTimers();
      this.waitPingTimer = setTimeout(function () {
        _this2.emit('sendPing');
        _this2.waitPong();
      }, this.pingTimeout);
    }
  }, {
    key: 'waitPong',
    value: function waitPong() {
      var _this3 = this;

      this._clearTimers();
      this.waitPongTimer = setTimeout(function () {
        return _this3.emit('timeout');
      }, this.pongTimeout);
    }
  }, {
    key: 'handlePing',
    value: function handlePing(id) {
      this._clearTimers();
      this.emit('sendPong', id);
      this.waitPing();
    }
  }, {
    key: 'handlePong',
    value: function handlePong() {
      this._clearTimers();
      this.waitPing();
    }
  }, {
    key: '_clearTimers',
    value: function _clearTimers() {
      clearTimeout(this.waitPingTimer);
      clearTimeout(this.waitPongTimer);
    }
  }]);

  return HeartbeatManager;
}(_AsyncEventEmitter3.default);

exports.default = HeartbeatManager;
},{"marsdb/dist/AsyncEventEmitter":23}],23:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Extension of a regular EventEmitter that provides a method
 * that returns a Promise then resolved when all listeners of the event
 * will be resolved.
 */
/* istanbul ignore next */

var AsyncEventEmitter = function (_EventEmitter) {
  _inherits(AsyncEventEmitter, _EventEmitter);

  function AsyncEventEmitter() {
    _classCallCheck(this, AsyncEventEmitter);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(AsyncEventEmitter).apply(this, arguments));
  }

  _createClass(AsyncEventEmitter, [{
    key: 'emitAsync',

    /**
     * Emit an event and return a Promise that will be resolved
     * when all listeren's Promises will be resolved.
     * @param  {String} event
     * @return {Promise}
     */
    value: function emitAsync(event, a1, a2, a3, a4, a5) {
      var prefix = _eventemitter2.default.prefixed;
      var evt = prefix ? prefix + event : event;

      if (!this._events || !this._events[evt]) {
        return Promise.resolve();
      }

      var i = undefined;
      var listeners = this._events[evt];
      var len = arguments.length;
      var args = undefined;

      if ('function' === typeof listeners.fn) {
        if (listeners.once) {
          this.removeListener(event, listeners.fn, undefined, true);
        }

        switch (len) {
          case 1:
            return Promise.resolve(listeners.fn.call(listeners.context));
          case 2:
            return Promise.resolve(listeners.fn.call(listeners.context, a1));
          case 3:
            return Promise.resolve(listeners.fn.call(listeners.context, a1, a2));
          case 4:
            return Promise.resolve(listeners.fn.call(listeners.context, a1, a2, a3));
          case 5:
            return Promise.resolve(listeners.fn.call(listeners.context, a1, a2, a3, a4));
          case 6:
            return Promise.resolve(listeners.fn.call(listeners.context, a1, a2, a3, a4, a5));
        }

        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }

        return Promise.resolve(listeners.fn.apply(listeners.context, args));
      } else {
        var promises = [];
        var length = listeners.length;
        var j = undefined;

        for (i = 0; i < length; i++) {
          if (listeners[i].once) {
            this.removeListener(event, listeners[i].fn, undefined, true);
          }

          switch (len) {
            case 1:
              promises.push(Promise.resolve(listeners[i].fn.call(listeners[i].context)));break;
            case 2:
              promises.push(Promise.resolve(listeners[i].fn.call(listeners[i].context, a1)));break;
            case 3:
              promises.push(Promise.resolve(listeners[i].fn.call(listeners[i].context, a1, a2)));break;
            default:
              if (!args) {
                for (j = 1, args = new Array(len - 1); j < len; j++) {
                  args[j - 1] = arguments[j];
                }
              }
              promises.push(Promise.resolve(listeners[i].fn.apply(listeners[i].context, args)));
          }
        }

        return Promise.all(promises);
      }
    }
  }]);

  return AsyncEventEmitter;
}(_eventemitter2.default);

exports.default = AsyncEventEmitter;
},{"eventemitter3":9}],24:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _try2 = require('fast.js/function/try');

var _try3 = _interopRequireDefault(_try2);

var _doubleEndedQueue = require('double-ended-queue');

var _doubleEndedQueue2 = _interopRequireDefault(_doubleEndedQueue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * It limits concurrently executed promises
 *
 * @param {Number} [maxPendingPromises=Infinity] max number of concurrently executed promises
 * @param {Number} [maxQueuedPromises=Infinity]  max number of queued promises
 * @constructor
 */

var PromiseQueue = function () {
  function PromiseQueue() {
    var maxPendingPromises = arguments.length <= 0 || arguments[0] === undefined ? Infinity : arguments[0];
    var maxQueuedPromises = arguments.length <= 1 || arguments[1] === undefined ? Infinity : arguments[1];

    _classCallCheck(this, PromiseQueue);

    this.pendingPromises = 0;
    this.maxPendingPromises = maxPendingPromises;
    this.maxQueuedPromises = maxQueuedPromises;
    this.queue = new _doubleEndedQueue2.default();
    this.length = 0;
  }

  /**
   * Pause queue processing
   */

  _createClass(PromiseQueue, [{
    key: 'pause',
    value: function pause() {
      this._paused = true;
    }

    /**
     * Resume queue processing
     */

  }, {
    key: 'unpause',
    value: function unpause() {
      this._paused = false;
      this._dequeue();
    }

    /**
     * Adds new promise generator in the queue
     * @param {Function} promiseGenerator
     */

  }, {
    key: 'add',
    value: function add(promiseGenerator) {
      var _this = this;

      var unshift = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return new Promise(function (resolve, reject) {
        if (_this.length >= _this.maxQueuedPromises) {
          reject(new Error('Queue limit reached'));
        } else {
          var queueItem = {
            promiseGenerator: promiseGenerator,
            resolve: resolve,
            reject: reject
          };

          if (!unshift) {
            _this.queue.push(queueItem);
          } else {
            _this.queue.unshift(queueItem);
          }

          _this.length += 1;
          _this._dequeue();
        }
      });
    }

    /**
     * Internal queue processor. Starts processing of
     * the next queued function
     * @return {Boolean}
     */

  }, {
    key: '_dequeue',
    value: function _dequeue() {
      var _this2 = this;

      if (this._paused || this.pendingPromises >= this.maxPendingPromises) {
        return false;
      }

      var item = this.queue.shift();
      if (!item) {
        return false;
      }

      var result = (0, _try3.default)(function () {
        _this2.pendingPromises++;
        return Promise.resolve().then(function () {
          return item.promiseGenerator();
        }).then(function (value) {
          _this2.length--;
          _this2.pendingPromises--;
          item.resolve(value);
          _this2._dequeue();
        }, function (err) {
          _this2.length--;
          _this2.pendingPromises--;
          item.reject(err);
          _this2._dequeue();
        });
      });

      if (result instanceof Error) {
        this.length--;
        this.pendingPromises--;
        item.reject(result);
        this._dequeue();
      }

      return true;
    }
  }]);

  return PromiseQueue;
}();

exports.default = PromiseQueue;
},{"double-ended-queue":8,"fast.js/function/try":17}]},{},[7])(7)
});