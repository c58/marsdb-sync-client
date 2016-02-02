'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCollectionDelegate = createCollectionDelegate;

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _marsdb = require('marsdb');

var _marsdb2 = _interopRequireDefault(_marsdb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function createCollectionDelegate(connection) {
  var _currentDelegateClass = _marsdb2.default.defaultDelegate();

  /**
   * Collection manager is a factory for Mars.Collection
   * objects (one object by collection name).
   * It also syncing client/server changes.
   */

  var CollectionManager = function (_currentDelegateClass2) {
    _inherits(CollectionManager, _currentDelegateClass2);

    function CollectionManager() {
      var _Object$getPrototypeO;

      _classCallCheck(this, CollectionManager);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var _this = _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(CollectionManager)).call.apply(_Object$getPrototypeO, [this].concat(args)));

      connection.on('status:connected', _this._handleConnected.bind(_this));
      connection.on('message:added', _this._handleRemoteAdded.bind(_this));
      connection.on('message:changed', _this._handleRemoteChanged.bind(_this));
      connection.on('message:removed', _this._handleRemoteRemoved.bind(_this));
      return _this;
    }

    _createClass(CollectionManager, [{
      key: 'insert',
      value: function insert(doc) {
        var _this2 = this;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var randomId = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var localInsert = _get(Object.getPrototypeOf(CollectionManager.prototype), 'insert', this).call(this, doc, options, randomId);

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/insert';
          connection.methodManager.apply(methodName, [doc, options], randomId.seed).result().then(null, function (e) {
            return localInsert.then(function () {
              return _this2.db.remove(doc._id, { quiet: true });
            }).then(function () {
              throw e;
            });
          });
        }

        return localInsert;
      }
    }, {
      key: 'remove',
      value: function remove(query) {
        var _this3 = this;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var localRemove = _get(Object.getPrototypeOf(CollectionManager.prototype), 'remove', this).call(this, query, options);

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/remove';
          connection.methodManager.apply(methodName, [query, options]).result().then(null, function (e) {
            return localRemove.then(function (removedDocs) {
              return _this3.db.insertAll(removedDocs, { quiet: true });
            }).then(function () {
              throw e;
            });
          });
        }

        return localRemove;
      }
    }, {
      key: 'update',
      value: function update(query, modifier) {
        var _this4 = this;

        var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var localUpdate = _get(Object.getPrototypeOf(CollectionManager.prototype), 'update', this).call(this, query, modifier, options);

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/update';
          connection.methodManager.apply(methodName, [query, modifier, options]).result().then(null, function (e) {
            return localUpdate.then(function (res) {
              return _this4.db.insertAll(res.original.filter(function (d) {
                return d;
              }), { quiet: true });
            }).then(function () {
              throw e;
            });
          });
        }

        return localUpdate;
      }
    }, {
      key: '_handleRemoteAdded',
      value: function _handleRemoteAdded(msg) {
        var _this5 = this;

        this.db.ids(msg.id).then(function (ids) {
          if (ids.length) {
            return _this5.db.update(msg.id, msg.fields, { quiet: true });
          } else {
            var doc = _extends({ id: msg.id }, msg.fields);
            return _this5.db.insert(doc, { quiet: true });
          }
        });
      }
    }, {
      key: '_handleRemoteChanged',
      value: function _handleRemoteChanged(msg) {
        var modifier = {};
        if (Array.isArray(msg.cleared) && msg.cleared.length > 0) {
          modifier.$unset = {};
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = msg.cleared[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var f = _step.value;

              modifier.$unset[f] = 1;
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
        if (msg.fields) {
          modifier.$set = {};
          (0, _forEach2.default)(msg.fields, function (v, k) {
            modifier.$set[k] = v;
          });
        }

        return this.db.update(msg.id, modifier, { quiet: true });
      }
    }, {
      key: '_handleRemoteRemoved',
      value: function _handleRemoteRemoved(msg) {
        return this.db.remove(msg.id, { quiet: true });
      }
    }, {
      key: '_handleConnected',
      value: function _handleConnected(reconnected) {
        // TODO sync all collections with backend
      }
    }]);

    return CollectionManager;
  }(_currentDelegateClass);

  return CollectionManager;
}