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