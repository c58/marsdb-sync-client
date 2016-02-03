'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _marsdb = require('marsdb');

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

    _this.result = function () {
      return _this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this._error) {
          reject(_this._error);
        } else if (_this._result) {
          resolve(_this._result);
        } else {
          _this.once('result', resolve);
          _this.once('error', reject);
        }
      }));
    };

    _this.updated = function () {
      return _this._promiseMixed(new Promise(function (resolve, reject) {
        if (_this._updated) {
          resolve();
        } else {
          _this.once('updated', resolve);
        }
      }));
    };

    _this.id = _marsdb.Random.default().id(20);
    connection.sendMethod(method, params, _this.id, randomSeed);
    return _this;
  }

  _createClass(MethodCall, [{
    key: '_promiseMixed',
    value: function _promiseMixed(promise) {
      var _this2 = this;

      return {
        result: this.result,
        updated: this.updated,
        then: function then() {
          return _this2._promiseMixed(promise.then.apply(promise, arguments));
        }
      };
    }
  }, {
    key: '_handleResultMessage',
    value: function _handleResultMessage(msg) {
      if (msg.id == this.id) {
        if (msg.error) {
          this._error = msg.error;
          this.emit('error', msg.error);
        } else {
          this._result = msg.result;
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

exports.default = MethodCall;