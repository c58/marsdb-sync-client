'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CALL_STATUS = undefined;

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

var _marsdb = require('marsdb');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Method call statuses
var CALL_STATUS = exports.CALL_STATUS = {
  RESULT: 'RESULT',
  ERROR: 'ERROR',
  UPDATED: 'UPDATED'
};

/**
 * Class for tracking method call status.
 */

var MethodCall = function (_EventEmitter) {
  _inherits(MethodCall, _EventEmitter);

  function MethodCall(method, params, randomSeed, connection) {
    _classCallCheck(this, MethodCall);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MethodCall).call(this));

    _this.id = _marsdb.Random.default().id(20);
    _this.result = (0, _bind3.default)(_this.result, _this);
    _this.updated = (0, _bind3.default)(_this.updated, _this);

    connection.sendMethod(method, params, _this.id, randomSeed);
    return _this;
  }

  /**
   * Returns a promise that will be resolved when result
   * of funciton call is received. It is also have "result"
   * and "updated" fields for chaining
   * @return {Promise}
   */

  _createClass(MethodCall, [{
    key: 'result',
    value: function result() {
      var _this2 = this;

      return this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this2._error) {
          reject(_this2._error);
        } else if (_this2._result) {
          resolve(_this2._result);
        } else {
          _this2.once(CALL_STATUS.RESULT, resolve);
          _this2.once(CALL_STATUS.ERROR, reject);
        }
      }));
    }

    /**
     * Returns a promise that will be resolved when updated
     * message received for given funciton call. It is also
     * have "result" and "updated" fields for chaining.
     * @return {Promise}
     */

  }, {
    key: 'updated',
    value: function updated() {
      var _this3 = this;

      return this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this3._updated) {
          resolve();
        } else {
          _this3.once(CALL_STATUS.UPDATED, resolve);
        }
      }));
    }
  }, {
    key: '_promiseMixed',
    value: function _promiseMixed(promise) {
      var _this4 = this;

      return {
        result: this.result,
        updated: this.updated,
        then: function then() {
          return _this4._promiseMixed(promise.then.apply(promise, arguments));
        }
      };
    }
  }, {
    key: '_handleResult',
    value: function _handleResult(error, result) {
      if (error) {
        this._error = error;
        this.emit(CALL_STATUS.ERROR, error);
      } else {
        this._result = result;
        this.emit(CALL_STATUS.RESULT, result);
      }
    }
  }, {
    key: '_handleUpdated',
    value: function _handleUpdated(msg) {
      this._updated = true;
      this.emit(CALL_STATUS.UPDATED);
    }
  }]);

  return MethodCall;
}(_marsdb.EventEmitter);

exports.default = MethodCall;