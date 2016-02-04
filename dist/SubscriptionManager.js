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