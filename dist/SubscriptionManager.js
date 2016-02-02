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