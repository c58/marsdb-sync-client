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