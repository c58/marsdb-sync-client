(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.Mars || (g.Mars = {})).Meteor = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCollectionDelegate = createCollectionDelegate;

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _map2 = require('fast.js/map');

var _map3 = _interopRequireDefault(_map2);

var _keys2 = require('fast.js/object/keys');

var _keys3 = _interopRequireDefault(_keys2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Collection = typeof window !== 'undefined' && window.Mars ? window.Mars.Collection : require('marsdb').Collection;

function createCollectionDelegate(connection) {
  var _currentDelegateClass = Collection.defaultDelegate();

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

      connection.on('status:connected', (0, _bind3.default)(_this._handleConnected, _this));
      connection.on('message:added', (0, _bind3.default)(_this._handleRemoteAdded, _this));
      connection.on('message:changed', (0, _bind3.default)(_this._handleRemoteChanged, _this));
      connection.on('message:removed', (0, _bind3.default)(_this._handleRemoteRemoved, _this));
      return _this;
    }

    /**
     * Calls remote method `/_collection_name_/insert`. It reverts back
     * optimistic update on server fail. It also have some options
     * to customize working approach:
     * `retryOnDisconnect` option retry method call if it was failed
     * 										 because dicsonnection. Default is true.
     * `waitResult` option disable optimistic update of the collection.
     * 							Returned Promise will be resolved when server returns
     * 							the result.
     * @param  {Object}  doc
     * @param  {Boolean} options.retryOnDisconnect
     * @param  {Boolean} options.waitResult
     * @param  {Object}  randomId
     * @return {Promise}
     */

    _createClass(CollectionManager, [{
      key: 'insert',
      value: function insert(doc) {
        var _this2 = this;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var randomId = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var localInsert = undefined;

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/insert';
          var handleInsertError = function handleInsertError(e) {
            return localInsert.then(function () {
              return _this2.db.remove(doc._id, { quiet: true });
            }).then(function () {
              throw e;
            });
          };
          var applyOpts = {
            retryOnDisconnect: options.retryOnDisconnect === false ? false : true, // eslint-disable-line
            randomSeed: randomId.seed
          };
          var result = connection.methodManager.apply(methodName, [doc, options], applyOpts).then(null, handleInsertError);

          if (options.waitResult) {
            return result;
          } else {
            result.then(null, function (e) {
              return console.error('Error while calling remote method:', e);
            });
          }
        }

        localInsert = _get(Object.getPrototypeOf(CollectionManager.prototype), 'insert', this).call(this, doc, options, randomId);
        return localInsert;
      }

      /**
       * Calls remote method `/_collection_name_/remove`. It reverts back
       * optimistic update on server fail. It also have some options
       * to customize working approach:
       * `retryOnDisconnect` option retry method call if it was failed
       * 										 because dicsonnection. Default is true.
       * `waitResult` option disable optimistic update of the collection.
       * 							Returned Promise will be resolved when server returns
       * 							the result.
       * @param  {Object}  doc
       * @param  {Boolean} options.retryOnDisconnect
       * @param  {Boolean} options.waitResult
       * @param  {Object}  randomId
       * @return {Promise}
       */

    }, {
      key: 'remove',
      value: function remove(query) {
        var _this3 = this;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var localRemove = undefined;

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/remove';
          var handleRemoveError = function handleRemoveError(e) {
            return localRemove.then(function (remDocs) {
              return _this3.db.insertAll(remDocs, { quiet: true });
            }).then(function () {
              throw e;
            });
          };
          var applyOpts = {
            retryOnDisconnect: options.retryOnDisconnect === false ? false : true };
          // eslint-disable-line
          var result = connection.methodManager.apply(methodName, [query, options], applyOpts).then(null, handleRemoveError);

          if (options.waitResult) {
            return result;
          } else {
            result.then(null, function (e) {
              return console.error('Error while calling remote method:', e);
            });
          }
        }

        localRemove = _get(Object.getPrototypeOf(CollectionManager.prototype), 'remove', this).call(this, query, options);
        return localRemove;
      }

      /**
       * Calls remote method `/_collection_name_/update`. It reverts back
       * optimistic update on server fail. It also have some options
       * to customize working approach:
       * `retryOnDisconnect` option retry method call if it was failed
       * 										 because dicsonnection. Default is true.
       * `waitResult` option disable optimistic update of the collection.
       * 							Returned Promise will be resolved when server returns
       * 							the result.
       * @param  {Object}  doc
       * @param  {Boolean} options.retryOnDisconnect
       * @param  {Boolean} options.waitResult
       * @param  {Object}  randomId
       * @return {Promise}
       */

    }, {
      key: 'update',
      value: function update(query, modifier) {
        var _this4 = this;

        var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var localUpdate = undefined;

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/update';
          var handleUpdateError = function handleUpdateError(e) {
            return localUpdate.then(function (res) {
              return (0, _map3.default)(res.updated, function (d, i) {
                if (!res.original[i]) {
                  return _this4.db.remove(d._id, { quiet: true });
                } else {
                  var docId = res.original[i]._id;
                  delete res.original[i]._id;
                  return _this4.db.update({ _id: docId }, res.original[i], { quiet: true, upsert: true });
                }
              });
            }).then(function () {
              throw e;
            });
          };

          var applyOpts = {
            retryOnDisconnect: options.retryOnDisconnect === false ? false : true };
          // eslint-disable-line
          var result = connection.methodManager.apply(methodName, [query, modifier, options], applyOpts).then(null, handleUpdateError);

          if (options.waitResult) {
            return result;
          } else {
            result.then(null, function (e) {
              return console.error('Error while calling remote method:', e);
            });
          }
        }

        localUpdate = _get(Object.getPrototypeOf(CollectionManager.prototype), 'update', this).call(this, query, modifier, options);
        return localUpdate;
      }
    }, {
      key: '_handleRemoteAdded',
      value: function _handleRemoteAdded(msg) {
        delete msg.fields._id;
        return this.db.update({ _id: msg.id }, msg.fields, { quiet: true, upsert: true });
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
          delete msg.fields._id;
          modifier.$set = {};
          (0, _forEach2.default)(msg.fields, function (v, k) {
            modifier.$set[k] = v;
          });
        }

        if ((0, _keys3.default)(modifier).length > 0) {
          return this.db.update(msg.id, modifier, { quiet: true });
        }
      }
    }, {
      key: '_handleRemoteRemoved',
      value: function _handleRemoteRemoved(msg) {
        return this.db.remove(msg.id, { quiet: true });
      }
    }, {
      key: '_handleConnected',
      value: function _handleConnected(reconnected) {
        var _this5 = this;

        var methodName = '/' + this.db.modelName + '/sync';
        return this.db.ids().then(function (ids) {
          return connection.methodManager.apply(methodName, [ids]).result();
        }).then(function (removedIds) {
          return _this5.db.remove({ _id: { $in: removedIds } }, { quiet: true, multi: true });
        });
      }
    }]);

    return CollectionManager;
  }(_currentDelegateClass);

  return CollectionManager;
}
},{"fast.js/forEach":14,"fast.js/function/bind":17,"fast.js/map":20,"fast.js/object/keys":22,"marsdb":undefined}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._isCacheValid = _isCacheValid;
exports.createCursorWithSub = createCursorWithSub;

var _keys2 = require('fast.js/object/keys');

var _keys3 = _interopRequireDefault(_keys2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Collection = typeof window !== 'undefined' && window.Mars ? window.Mars.Collection : require('marsdb').Collection;

// Internals
function _isCacheValid(tryCache, result) {
  var resolveCache = false;
  if (typeof tryCache === 'function') {
    resolveCache = tryCache(result);
  } else if (Array.isArray(result) && result.length > 0 || Object.prototype.toString.call(result) === '[object Object]' && (0, _keys3.default)(result).length > 0) {
    resolveCache = true;
  }
  return resolveCache;
}

/**
 * Creates a Cursor class based on current default crusor class.
 * Created class adds support of `sub` field of options for
 * automatically subscribe/unsubscribe.
 * @param  {DDPConnection} connection
 * @return {Cursor}
 */
function createCursorWithSub(connection) {
  var _currentCursorClass = Collection.defaultCursor();

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
      value: function _doUpdate(firstRun) {
        var _this2 = this;

        var _options = this.options;
        var sub = _options.sub;
        var waitReady = _options.waitReady;
        var tryCache = _options.tryCache;

        var superUpdate = function superUpdate() {
          return _get(Object.getPrototypeOf(CursorWithSub.prototype), '_doUpdate', _this2).call(_this2, firstRun);
        };

        if (!this._subscription && sub) {
          var _connection$subManage;

          this._subscription = (_connection$subManage = connection.subManager).subscribe.apply(_connection$subManage, _toConsumableArray(sub));

          this.once('observeStopped', function () {
            _this2._subscription.stop();
            delete _this2._subscription;
          });

          if (waitReady) {
            return this._subscription.ready().then(superUpdate);
          } else if (tryCache) {
            return this.exec().then(function (result) {
              if (_isCacheValid(tryCache, result)) {
                _this2._updateLatestIds();
                return _this2._propagateUpdate(firstRun).then(function () {
                  return result;
                });
              } else {
                return _this2._subscription.ready().then(superUpdate);
              }
            });
          }
        }

        return superUpdate();
      }
    }]);

    return CursorWithSub;
  }(_currentCursorClass);

  return CursorWithSub;
}
},{"fast.js/object/keys":22,"marsdb":undefined}],3:[function(require,module,exports){
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
    var socket = _ref.socket;
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
    _this._fullConnectedOnce = false;

    _this._heartbeat = new _HeartbeatManager2.default(HEARTBEAT_INTERVAL, HEARTBEAT_TIMEOUT);
    _this._heartbeat.on('timeout', (0, _bind3.default)(_this._handleHearbeatTimeout, _this));
    _this._heartbeat.on('sendPing', (0, _bind3.default)(_this.sendPing, _this));
    _this._heartbeat.on('sendPong', (0, _bind3.default)(_this.sendPong, _this));
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
        var isTrulyReconnected = this._fullConnectedOnce && this._reconnecting;
        this._setStatus(CONN_STATUS.CONNECTED, isTrulyReconnected);
        this._sessionId = msg.session;
        this._reconnecting = false;
        this._fullConnectedOnce = true;
      }
    }
  }, {
    key: '_handleClose',
    value: function _handleClose() {
      this._heartbeat._clearTimers();
      this._setStatus(CONN_STATUS.DISCONNECTED, this._fullConnectedOnce);

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
},{"./HeartbeatManager":5,"fast.js/function/bind":17,"fast.js/function/try":19,"marsdb":undefined}],4:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Manager for handling processing and remote errors.
 * For now it is just print warning in a console.
 */

var ErrorManager = function () {
  function ErrorManager(connection) {
    _classCallCheck(this, ErrorManager);

    this.conn = connection;
    connection.on('message:error', (0, _bind3.default)(this._handleError, this));
    connection.on('error', (0, _bind3.default)(this._handleError, this));
  }

  _createClass(ErrorManager, [{
    key: '_handleError',
    value: function _handleError(error) {
      if (error && error.message) {
        console.warn(error.message + '\n' + error.stack);
      } else {
        console.warn(JSON.stringify(error));
      }
    }
  }]);

  return ErrorManager;
}();

exports.default = ErrorManager;
},{"fast.js/function/bind":17}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = typeof window !== 'undefined' && window.Mars ? window.Mars.EventEmitter : require('marsdb').EventEmitter;

/**
 * Manages a heartbeat with a client
 */

var HeartbeatManager = function (_EventEmitter) {
  _inherits(HeartbeatManager, _EventEmitter);

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
}(EventEmitter);

exports.default = HeartbeatManager;
},{"marsdb":undefined}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = typeof window !== 'undefined' && window.Mars ? window.Mars.EventEmitter : require('marsdb').EventEmitter;
var Random = typeof window !== 'undefined' && window.Mars ? window.Mars.Random : require('marsdb').Random;

// Method call statuses
var CALL_STATUS = exports.CALL_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  RESULT: 'RESULT',
  ERROR: 'ERROR',
  UPDATED: 'UPDATED'
};

/**
 * Class for tracking method call status.
 */

var MethodCall = function (_EventEmitter) {
  _inherits(MethodCall, _EventEmitter);

  function MethodCall(method, params) {
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
    var connection = arguments[3];

    _classCallCheck(this, MethodCall);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MethodCall).call(this));

    _this.result = function () {
      return _this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this._error) {
          reject(_this._error);
        } else if (_this._result) {
          resolve(_this._result);
        } else {
          _this.once(CALL_STATUS.RESULT, resolve);
          _this.once(CALL_STATUS.ERROR, reject);
        }
      }));
    };

    _this.updated = function () {
      return _this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this._updated) {
          resolve();
        } else {
          _this.once(CALL_STATUS.UPDATED, resolve);
        }
      }));
    };

    _this.id = Random.default().id(20);
    _this.status = CALL_STATUS.PENDING;
    _this.method = method;
    _this.params = params;
    _this.options = options;
    _this._conn = connection;
    return _this;
  }

  _createClass(MethodCall, [{
    key: 'then',

    /**
     * Shorthand for updated and result
     * @param  {Function} succFn
     * @param  {Function} failFn
     * @return {Promise}
     */
    value: function then(succFn, failFn) {
      var _this2 = this;

      return this.updated().then(function () {
        return _this2.result().then(succFn, failFn);
      }, failFn);
    }
  }, {
    key: '_invoke',
    value: function _invoke() {
      this._conn.sendMethod(this.method, this.params, this.id, this.options.randomSeed);
      this._setStatus(CALL_STATUS.SENT);
    }
  }, {
    key: '_retry',
    value: function _retry() {
      this._setStatus(CALL_STATUS.PENDING);
    }
  }, {
    key: '_promiseMixed',
    value: function _promiseMixed(promise) {
      var _this3 = this;

      return {
        result: this.result,
        updated: this.updated,
        then: function then() {
          return _this3._promiseMixed(promise.then.apply(promise, arguments));
        }
      };
    }
  }, {
    key: '_handleResult',
    value: function _handleResult(error, result) {
      if (error) {
        this._error = error;
        this._setStatus(CALL_STATUS.ERROR, error);
      } else {
        this._result = result;
        this._setStatus(CALL_STATUS.RESULT, result);
      }
    }
  }, {
    key: '_handleUpdated',
    value: function _handleUpdated(msg) {
      this._updated = true;
      this._setStatus(CALL_STATUS.UPDATED);
    }
  }, {
    key: '_setStatus',
    value: function _setStatus(status, a, b, c, d) {
      this.status = status;
      this.emit(status, a, b, c, d);
    }
  }, {
    key: 'isPending',
    get: function get() {
      return this.status === CALL_STATUS.PENDING;
    }
  }, {
    key: 'isSent',
    get: function get() {
      return this.status === CALL_STATUS.SENT;
    }
  }, {
    key: 'isDone',
    get: function get() {
      return this.status !== CALL_STATUS.SENT && this.status !== CALL_STATUS.PENDING;
    }

    /**
     * Returns a promise that will be resolved when result
     * of funciton call is received. It is also have "result"
     * and "updated" fields for chaining
     * @return {Promise}
     */

    /**
     * Returns a promise that will be resolved when updated
     * message received for given funciton call. It is also
     * have "result" and "updated" fields for chaining.
     * @return {Promise}
     */

  }]);

  return MethodCall;
}(EventEmitter);

exports.default = MethodCall;
},{"marsdb":undefined}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _MethodCall = require('./MethodCall');

var _MethodCall2 = _interopRequireDefault(_MethodCall);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

    connection.on('status:disconnected', (0, _bind3.default)(this._handleDisconnected, this));
    connection.on('status:connected', (0, _bind3.default)(this._handleConnected, this));
    connection.on('message:result', (0, _bind3.default)(this._handleMethodResult, this));
    connection.on('message:updated', (0, _bind3.default)(this._handleMethodUpdated, this));
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
    value: function apply(method) {
      var _this = this;

      var params = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var call = new _MethodCall2.default(method, params, options, this.conn);
      this._methods[call.id] = call;

      var cleanupCallback = function cleanupCallback() {
        return delete _this._methods[call.id];
      };
      call.then(cleanupCallback, cleanupCallback);

      if (this.conn.isConnected) {
        call._invoke();
      }

      return call;
    }
  }, {
    key: '_handleMethodResult',
    value: function _handleMethodResult(msg) {
      if (msg.id && this._methods[msg.id]) {
        var result = msg.result;
        var error = msg.error;

        this._methods[msg.id]._handleResult(error, result);
      }
    }
  }, {
    key: '_handleMethodUpdated',
    value: function _handleMethodUpdated(msg) {
      var _this2 = this;

      (0, _forEach2.default)(msg.methods, function (mid) {
        if (_this2._methods[mid]) {
          _this2._methods[mid]._handleUpdated();
        }
      });
    }
  }, {
    key: '_handleDisconnected',
    value: function _handleDisconnected() {
      (0, _forEach2.default)(this._methods, function (methodCall) {
        if (methodCall.isSent) {
          if (!methodCall.options.retryOnDisconnect) {
            methodCall._handleResult({
              reason: 'Disconnected, method can\'t be done',
              code: 'DISCONNECTED'
            });
          } else {
            methodCall._retry();
          }
        }
      });
    }
  }, {
    key: '_handleConnected',
    value: function _handleConnected() {
      (0, _forEach2.default)(this._methods, function (methodCall) {
        if (methodCall.isPending) {
          methodCall._invoke();
        }
      });
    }
  }]);

  return MethodCallManager;
}();

exports.default = MethodCallManager;
},{"./MethodCall":6,"fast.js/forEach":14,"fast.js/function/bind":17}],8:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = typeof window !== 'undefined' && window.Mars ? window.Mars.EventEmitter : require('marsdb').EventEmitter;
var Random = typeof window !== 'undefined' && window.Mars ? window.Mars.Random : require('marsdb').Random;

// Status of the subsctiption
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

  function Subscription(name, params, conn) {
    var stopWaitTimeout = arguments.length <= 3 || arguments[3] === undefined ? 15000 : arguments[3];

    _classCallCheck(this, Subscription);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Subscription).call(this));

    _this.ready = function () {
      return _this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this.isReady) {
          resolve();
        } else {
          _this.once(SUB_STATUS.READY, resolve);
          _this.once(SUB_STATUS.ERROR, reject);
        }
      }));
    };

    _this.stopped = function () {
      return _this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this.isStopped) {
          resolve();
        } else {
          _this.once(SUB_STATUS.STOPPED, resolve);
          _this.once(SUB_STATUS.ERROR, reject);
        }
      }));
    };

    _this.stop = function () {
      _this._scheduleStop();
    };

    _this.id = Random.default().id(20);
    _this.name = name;
    _this.params = params;
    _this._conn = conn;
    _this._ready = false;
    _this._stopWaitTimeout = stopWaitTimeout;
    return _this;
  }

  _createClass(Subscription, [{
    key: 'then',
    value: function then(succFn, failFn) {
      return this.ready().then(succFn, failFn);
    }
  }, {
    key: '_promiseMixed',
    value: function _promiseMixed(promise) {
      var _this2 = this;

      return {
        stopped: this.stopped,
        ready: this.ready,
        stop: this.stop,
        then: function then() {
          return _this2._promiseMixed(promise.then.apply(promise, arguments));
        }
      };
    }
  }, {
    key: '_subscribe',
    value: function _subscribe() {
      if (!this.status || this.status === SUB_STATUS.STOP_PENDING || this.status === SUB_STATUS.STOPPED || this.status === SUB_STATUS.ERROR || this.status === SUB_STATUS.FROZEN) {
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
  }, {
    key: '_scheduleStop',
    value: function _scheduleStop() {
      var _this3 = this;

      if (this.status !== SUB_STATUS.STOP_PENDING && this.status !== SUB_STATUS.STOPPED) {
        this._setStatus(SUB_STATUS.STOP_PENDING);
        this._stopTimer = setTimeout(function () {
          return _this3._stopImmediately();
        }, this._stopWaitTimeout);
      }
    }
  }, {
    key: '_stopImmediately',
    value: function _stopImmediately(options) {
      if (this.status !== SUB_STATUS.STOPPED) {
        this._clearStopper();
        this._setStatus(SUB_STATUS.STOPPED);
        this._ready = false;

        if (!options || !options.dontSendMsg) {
          this._conn.sendUnsub(this.id);
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
    key: '_handleNosub',
    value: function _handleNosub(error) {
      this._clearStopper();
      if (error) {
        this._setStatus(SUB_STATUS.ERROR, error);
      } else {
        this._stopImmediately({ dontSendMsg: true });
      }
    }
  }, {
    key: '_handleReady',
    value: function _handleReady() {
      if (this.status !== SUB_STATUS.STOPPED && this.status !== SUB_STATUS.STOP_PENDING) {
        this._ready = true;
        this._setStatus(SUB_STATUS.READY);
      }
    }
  }, {
    key: 'isReady',
    get: function get() {
      return this.status == SUB_STATUS.READY || this.status === SUB_STATUS.FROZEN && this._ready;
    }
  }, {
    key: 'isReadyPending',
    get: function get() {
      return this.status === SUB_STATUS.READY_PENDING;
    }
  }, {
    key: 'isStopped',
    get: function get() {
      return this.status === SUB_STATUS.STOPPED;
    }
  }, {
    key: 'isStopPending',
    get: function get() {
      return this.status === SUB_STATUS.STOP_PENDING;
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
}(EventEmitter);

exports.default = Subscription;
},{"marsdb":undefined}],9:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _Subscription = require('./Subscription');

var _Subscription2 = _interopRequireDefault(_Subscription);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = typeof window !== 'undefined' && window.Mars ? window.Mars.EventEmitter : require('marsdb').EventEmitter;

// Internals
var STOP_SUB_DELAY = 15000;

/**
 * The manager tracks all subscriptions on the application
 * and make reaction on some life-cycle events, like stop
 * subscription.
 */

var SubscriptionManager = function (_EventEmitter) {
  _inherits(SubscriptionManager, _EventEmitter);

  function SubscriptionManager(connection) {
    _classCallCheck(this, SubscriptionManager);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(SubscriptionManager).call(this));

    _this._subs = {};
    _this._loading = new Set();
    _this._conn = connection;

    connection.on('status:connected', (0, _bind3.default)(_this._handleConnected, _this));
    connection.on('status:disconnected', (0, _bind3.default)(_this._handleDisconnected, _this));
    connection.on('message:ready', (0, _bind3.default)(_this._handleSubscriptionReady, _this));
    connection.on('message:nosub', (0, _bind3.default)(_this._handleSubscriptionNosub, _this));
    return _this;
  }

  /**
   * Subscribe to publisher by given name with params.
   * Return Subscription object with stop, ready, and stopped
   * methods.
   * @param  {String}    name
   * @param  {...Mixed}  params
   * @return {Subscription}
   */

  _createClass(SubscriptionManager, [{
    key: 'subscribe',
    value: function subscribe(name) {
      var _this2 = this;

      for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        params[_key - 1] = arguments[_key];
      }

      // Create and register subscription
      var sub = new _Subscription2.default(name, params, this._conn, STOP_SUB_DELAY);
      this._subs[sub.id] = sub;
      this._trackLoadingStart(sub.id);

      // Remove sub from manager on stop or error
      var cleanupCallback = function cleanupCallback() {
        delete _this2._subs[sub.id];
        _this2._trackLoadingReady(sub.id);
      };
      sub.once(_Subscription.SUB_STATUS.STOPPED, cleanupCallback);
      sub.once(_Subscription.SUB_STATUS.ERROR, cleanupCallback);

      // Start subscription
      if (this._conn.isConnected) {
        sub._subscribe();
      } else {
        sub._freeze();
      }

      return sub;
    }

    /**
     * Given callback invoked anytime when all
     * subscriptions is ready. Return a function for
     * stop watching the event.
     * @return {Function}
     */

  }, {
    key: 'addReadyListener',
    value: function addReadyListener(cb) {
      var _this3 = this;

      this.on('ready', cb);
      return function () {
        return _this3.removeListener('ready', cb);
      };
    }

    /**
     * Given callback invoked when first subscription started.
     * It is not invoked for any other new subs if some sub
     * is loading.
     * @return {Function}
     */

  }, {
    key: 'addLoadingListener',
    value: function addLoadingListener(cb) {
      var _this4 = this;

      this.on('loading', cb);
      return function () {
        return _this4.removeListener('loading', cb);
      };
    }
  }, {
    key: '_handleConnected',
    value: function _handleConnected() {
      (0, _forEach2.default)(this._subs, function (sub) {
        return sub._subscribe();
      });
    }
  }, {
    key: '_handleDisconnected',
    value: function _handleDisconnected() {
      var _this5 = this;

      (0, _forEach2.default)(this._subs, function (sub, sid) {
        sub._freeze();
        if (sub.isFrozen) {
          _this5._trackLoadingStart(sid);
        } else {
          _this5._trackLoadingReady(sid);
        }
      });
    }
  }, {
    key: '_handleSubscriptionReady',
    value: function _handleSubscriptionReady(msg) {
      var _this6 = this;

      (0, _forEach2.default)(msg.subs, function (sid) {
        var sub = _this6._subs[sid];
        if (sub) {
          sub._handleReady();
          _this6._trackLoadingReady(sid);
        }
      });
    }
  }, {
    key: '_handleSubscriptionNosub',
    value: function _handleSubscriptionNosub(msg) {
      var sub = this._subs[msg.id];
      if (sub) {
        sub._handleNosub(msg.error);
      }
    }
  }, {
    key: '_trackLoadingStart',
    value: function _trackLoadingStart(subId) {
      var prevSize = this._loading.size;
      this._loading.add(subId);
      if (prevSize === 0 && this._loading.size > 0) {
        this.emit('loading');
      }
    }
  }, {
    key: '_trackLoadingReady',
    value: function _trackLoadingReady(subId) {
      var prevSize = this._loading.size;
      this._loading.delete(subId);
      if (prevSize > 0 && this._loading.size === 0) {
        this.emit('ready');
      }
    }
  }]);

  return SubscriptionManager;
}(EventEmitter);

exports.default = SubscriptionManager;
},{"./Subscription":8,"fast.js/forEach":14,"fast.js/function/bind":17,"marsdb":undefined}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._removeConnection = _removeConnection;
exports.getConnection = getConnection;
exports.addManager = addManager;
exports.call = call;
exports.apply = apply;
exports.subscribe = subscribe;
exports.configure = configure;

var _map2 = require('fast.js/map');

var _map3 = _interopRequireDefault(_map2);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _DDPConnection = require('./DDPConnection');

var _DDPConnection2 = _interopRequireDefault(_DDPConnection);

var _SubscriptionManager = require('./SubscriptionManager');

var _SubscriptionManager2 = _interopRequireDefault(_SubscriptionManager);

var _MethodCallManager = require('./MethodCallManager');

var _MethodCallManager2 = _interopRequireDefault(_MethodCallManager);

var _ErrorManager = require('./ErrorManager');

var _ErrorManager2 = _interopRequireDefault(_ErrorManager);

var _CollectionManager = require('./CollectionManager');

var _CursorWithSub = require('./CursorWithSub');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Collection = typeof window !== 'undefined' && window.Mars ? window.Mars.Collection : require('marsdb').Collection;

// Internals
var _managers = [];
var _connection = null;

function _removeConnection() {
  _connection = null;
}

/**
 * Returns current DDPConnection object or null
 * if connection is not configured
 * @return {DDPConnection}
 */
function getConnection() {
  return _connection;
}

/**
 * Adds manager for ddp connection, that will be created
 * when connection will be established.
 * @param {Class} managerClass
 */
function addManager(managerClass) {
  (0, _invariant2.default)(!_connection, 'addManager(...): you can add managers only at first execution cycle');
  return _managers.push(managerClass);
}

/**
 * Call some remote method
 * @param  {String} methodName
 * @param  {Mixed}  ...params
 * @return {MethodCall}
 */
function call() {
  var _connection$methodMan;

  (0, _invariant2.default)(_connection, 'call(...): connection is not established yet. Please use ' + 'Collection.startup(...) to initialize your app');
  return (_connection$methodMan = _connection.methodManager).call.apply(_connection$methodMan, arguments);
}

/**
 * Apply some remote method
 * @param  {String} methodName
 * @param  {Array}  params
 * @return {MethodCall}
 */
function apply() {
  var _connection$methodMan2;

  (0, _invariant2.default)(_connection, 'apply(...): connection is not established yet. Please use ' + 'Collection.startup(...) to initialize your app');
  return (_connection$methodMan2 = _connection.methodManager).apply.apply(_connection$methodMan2, arguments);
}

/**
 * Subscribe by some publisher with arguments
 * @param  {String} pubName
 * @param  {String} ...args
 * @return {Subscription}
 */
function subscribe() {
  var _connection$subManage;

  (0, _invariant2.default)(_connection, 'subscribe(...): connection is not established yet. Please use ' + 'Collection.startup(...) to initialize your app');
  return (_connection$subManage = _connection.subManager).subscribe.apply(_connection$subManage, arguments);
}

/**
 * Configure application to use MarsSync client.
 * Set high-order cursor and delegate in Collection.
 * Starts up the connection in Collection.startup(...)
 * @param  {String} options.url
 * @param  {Class}  options.socket
 * @return {DDPConnection}
 */
function configure() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  (0, _invariant2.default)(options.socket || typeof WebSocket !== 'undefined', 'configure(...): no socket consturctor provided and not available in global');
  (0, _invariant2.default)(!_connection, 'configure(...): connection already configured');

  // Initiate DDPConnection
  options.socket = options.socket || WebSocket;
  _connection = new _DDPConnection2.default(options);
  Collection.defaultDelegate((0, _CollectionManager.createCollectionDelegate)(_connection));
  Collection.defaultCursor((0, _CursorWithSub.createCursorWithSub)(_connection));

  // Create connectionmanagers.
  // The order is IMPORTANT, firstest managers handle
  // connection state changes firstly.
  _connection.customManagers = (0, _map3.default)(_managers, function (x) {
    return new x(_connection);
  });
  _connection.methodManager = new _MethodCallManager2.default(_connection);
  _connection.subManager = new _SubscriptionManager2.default(_connection);
  _connection.errorManager = new _ErrorManager2.default(_connection);
  _connection.connect();
  return _connection;
}
},{"./CollectionManager":1,"./CursorWithSub":2,"./DDPConnection":3,"./ErrorManager":4,"./MethodCallManager":7,"./SubscriptionManager":9,"fast.js/map":20,"invariant":24,"marsdb":undefined}],11:[function(require,module,exports){
module.exports = require('./dist');

},{"./dist":10}],12:[function(require,module,exports){
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

},{"../function/bindInternal3":18}],13:[function(require,module,exports){
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

},{"../function/bindInternal3":18}],14:[function(require,module,exports){
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
},{"./array/forEach":12,"./object/forEach":21}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"./applyNoContext":15,"./applyWithContext":16}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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
},{"./array/map":13,"./object/map":23}],21:[function(require,module,exports){
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

},{"../function/bindInternal3":18}],22:[function(require,module,exports){
'use strict';

/**
 * Object.keys() shim for ES3 environments.
 *
 * @param  {Object} obj The object to get keys for.
 * @return {Array}      The array of keys.
 */
module.exports = typeof Object.keys === "function" ? Object.keys : /* istanbul ignore next */ function fastKeys (obj) {
  var keys = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(key);
    }
  }
  return keys;
};
},{}],23:[function(require,module,exports){
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

},{"../function/bindInternal3":18}],24:[function(require,module,exports){
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

},{}]},{},[11])(11)
});