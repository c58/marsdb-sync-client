'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

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
      var _this = this;

      (0, _invariant2.default)(typeof method === 'string', 'Method name must be a string, but given type is %s', typeof method === 'undefined' ? 'undefined' : _typeof(method));

      (0, _invariant2.default)(!params || Array.isArray(params), 'Params must be an array or undefined, but given type is %s', typeof params === 'undefined' ? 'undefined' : _typeof(params));

      var call = new _MethodCall2.default(method, params, randomSeed, this.conn);
      this._methods[call.id] = call;

      var cleanupCallback = function cleanupCallback() {
        if (_this._methods[call.id] && _this._methods[call.id]._result && _this._methods[call.id]._updated) {
          delete _this._methods[call.id];
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
      var _this2 = this;

      (0, _forEach2.default)(msg.methods, function (mid) {
        if (_this2._methods[mid]) {
          _this2._methods[mid]._handleUpdatedMessage(msg);
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