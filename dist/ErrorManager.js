'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

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