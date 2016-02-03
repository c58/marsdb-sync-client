'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SUB_STATUS = undefined;

var _marsdb = require('marsdb');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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

    _this.id = _marsdb.Random.default().id(20);
    _this.name = name;
    _this.params = params;
    _this._conn = conn;
    _this._ready = false;
    _this._stopWaitTimeout = stopWaitTimeout;
    return _this;
  }

  _createClass(Subscription, [{
    key: 'stop',
    value: function stop() {
      this._scheduleStop();
    }
  }, {
    key: '_promiseMixed',
    value: function _promiseMixed(promise) {
      var _this2 = this;

      return {
        stopped: this.stopped,
        ready: this.ready,
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
}(_marsdb.EventEmitter);

exports.default = Subscription;