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
    connection.sendMethod(method, params, _this.id, randomSeed);
    return _this;
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

  _createClass(MethodCall, [{
    key: 'then',
    value: function then(succFn, failFn) {
      var _this2 = this;

      return this.updated().then(function () {
        return _this2.result(succFn, failFn);
      }, failFn);
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
}(EventEmitter);

exports.default = MethodCall;