'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._isCacheValid = _isCacheValid;
exports.createCursorWithSub = createCursorWithSub;

var _keys2 = require('fast.js/object/keys');

var _keys3 = _interopRequireDefault(_keys2);

var _marsdb = require('marsdb');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Internals
function _isCacheValid(tryCache, result) {
  var resolveCache = false;
  if (typeof tryCache === 'function') {
    resolveCache = tryCache(result);
  } else if (Array.isArray(result) && result.length > 0 || Object.prototype.toString.call(result) === '[object Object]' && (0, _keys3.default)(result).length > 0) {
    resolveCache = true;
  }
  return resolveCache;
}

/**
 * Creates a Cursor class based on current default crusor class.
 * Created class adds support of `sub` field of options for
 * automatically subscribe/unsubscribe.
 * @param  {DDPConnection} connection
 * @return {Cursor}
 */
function createCursorWithSub(connection) {
  var _currentCursorClass = _marsdb.Collection.defaultCursor();

  /**
   * Cursor that automatically subscribe and unsubscribe
   * on cursor observing statred/stopped.
   */

  var CursorWithSub = function (_currentCursorClass2) {
    _inherits(CursorWithSub, _currentCursorClass2);

    function CursorWithSub() {
      _classCallCheck(this, CursorWithSub);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(CursorWithSub).apply(this, arguments));
    }

    _createClass(CursorWithSub, [{
      key: '_doUpdate',
      value: function _doUpdate(firstRun) {
        var _this2 = this;

        var _options = this.options;
        var sub = _options.sub;
        var waitReady = _options.waitReady;
        var tryCache = _options.tryCache;

        var superUpdate = function superUpdate() {
          return _get(Object.getPrototypeOf(CursorWithSub.prototype), '_doUpdate', _this2).call(_this2, firstRun);
        };

        if (!this._subscription && sub) {
          var _connection$subManage;

          this._subscription = (_connection$subManage = connection.subManager).subscribe.apply(_connection$subManage, _toConsumableArray(sub));

          this.once('observeStopped', function () {
            _this2._subscription.stop();
            delete _this2._subscription;
          });

          if (waitReady) {
            return this._subscription.ready().then(superUpdate);
          } else if (tryCache) {
            return this.exec().then(function (result) {
              if (_isCacheValid(tryCache, result)) {
                _this2._updateLatestIds();
                return _this2._propagateUpdate(firstRun).then(function () {
                  return result;
                });
              } else {
                return _this2._subscription.ready().then(superUpdate);
              }
            });
          }
        }

        return superUpdate();
      }
    }]);

    return CursorWithSub;
  }(_currentCursorClass);

  return CursorWithSub;
}