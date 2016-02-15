'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCollectionDelegate = createCollectionDelegate;

var _bind2 = require('fast.js/function/bind');

var _bind3 = _interopRequireDefault(_bind2);

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _map2 = require('fast.js/map');

var _map3 = _interopRequireDefault(_map2);

var _keys2 = require('fast.js/object/keys');

var _keys3 = _interopRequireDefault(_keys2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Collection = typeof window !== 'undefined' && window.Mars ? window.Mars.Collection : require('marsdb').Collection;

function createCollectionDelegate(connection) {
  var _currentDelegateClass = Collection.defaultDelegate();

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

      connection.on('status:connected', (0, _bind3.default)(_this._handleConnected, _this));
      connection.on('message:added', (0, _bind3.default)(_this._handleRemoteAdded, _this));
      connection.on('message:changed', (0, _bind3.default)(_this._handleRemoteChanged, _this));
      connection.on('message:removed', (0, _bind3.default)(_this._handleRemoteRemoved, _this));
      return _this;
    }

    /**
     * Calls remote method `/_collection_name_/insert`. It reverts back
     * optimistic update on server fail. It also have some options
     * to customize working approach:
     * `retryOnDisconnect` option retry method call if it was failed
     * 										 because dicsonnection. Default is true.
     * `waitResult` option disable optimistic update of the collection.
     * 							Returned Promise will be resolved when server returns
     * 							the result.
     * @param  {Object}  doc
     * @param  {Boolean} options.retryOnDisconnect
     * @param  {Boolean} options.waitResult
     * @param  {Object}  randomId
     * @return {Promise}
     */

    _createClass(CollectionManager, [{
      key: 'insert',
      value: function insert(doc) {
        var _this2 = this;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var randomId = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var localInsert = undefined;

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/insert';
          var handleInsertError = function handleInsertError(e) {
            return localInsert.then(function () {
              return _this2.db.remove(doc._id, { quiet: true });
            }).then(function () {
              throw e;
            });
          };
          var applyOpts = {
            retryOnDisconnect: options.retryOnDisconnect === false ? false : true, // eslint-disable-line
            randomSeed: randomId.seed
          };
          var result = connection.methodManager.apply(methodName, [doc, options], applyOpts).then(null, handleInsertError);

          if (options.waitResult) {
            return result;
          } else {
            result.then(null, function (e) {
              return console.error('Error while calling remote method:', e);
            });
          }
        }

        localInsert = _get(Object.getPrototypeOf(CollectionManager.prototype), 'insert', this).call(this, doc, options, randomId);
        return localInsert;
      }

      /**
       * Calls remote method `/_collection_name_/remove`. It reverts back
       * optimistic update on server fail. It also have some options
       * to customize working approach:
       * `retryOnDisconnect` option retry method call if it was failed
       * 										 because dicsonnection. Default is true.
       * `waitResult` option disable optimistic update of the collection.
       * 							Returned Promise will be resolved when server returns
       * 							the result.
       * @param  {Object}  doc
       * @param  {Boolean} options.retryOnDisconnect
       * @param  {Boolean} options.waitResult
       * @param  {Object}  randomId
       * @return {Promise}
       */

    }, {
      key: 'remove',
      value: function remove(query) {
        var _this3 = this;

        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var localRemove = undefined;

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/remove';
          var handleRemoveError = function handleRemoveError(e) {
            return localRemove.then(function (remDocs) {
              return _this3.db.insertAll(remDocs, { quiet: true });
            }).then(function () {
              throw e;
            });
          };
          var applyOpts = {
            retryOnDisconnect: options.retryOnDisconnect === false ? false : true };
          // eslint-disable-line
          var result = connection.methodManager.apply(methodName, [query, options], applyOpts).then(null, handleRemoveError);

          if (options.waitResult) {
            return result;
          } else {
            result.then(null, function (e) {
              return console.error('Error while calling remote method:', e);
            });
          }
        }

        localRemove = _get(Object.getPrototypeOf(CollectionManager.prototype), 'remove', this).call(this, query, options);
        return localRemove;
      }

      /**
       * Calls remote method `/_collection_name_/update`. It reverts back
       * optimistic update on server fail. It also have some options
       * to customize working approach:
       * `retryOnDisconnect` option retry method call if it was failed
       * 										 because dicsonnection. Default is true.
       * `waitResult` option disable optimistic update of the collection.
       * 							Returned Promise will be resolved when server returns
       * 							the result.
       * @param  {Object}  doc
       * @param  {Boolean} options.retryOnDisconnect
       * @param  {Boolean} options.waitResult
       * @param  {Object}  randomId
       * @return {Promise}
       */

    }, {
      key: 'update',
      value: function update(query, modifier) {
        var _this4 = this;

        var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var localUpdate = undefined;

        if (!options.quiet) {
          var methodName = '/' + this.db.modelName + '/update';
          var handleUpdateError = function handleUpdateError(e) {
            return localUpdate.then(function (res) {
              return (0, _map3.default)(res.updated, function (d, i) {
                if (!res.original[i]) {
                  return _this4.db.remove(d._id, { quiet: true });
                } else {
                  var docId = res.original[i]._id;
                  delete res.original[i]._id;
                  return _this4.db.update({ _id: docId }, res.original[i], { quiet: true, upsert: true });
                }
              });
            }).then(function () {
              throw e;
            });
          };

          var applyOpts = {
            retryOnDisconnect: options.retryOnDisconnect === false ? false : true };
          // eslint-disable-line
          var result = connection.methodManager.apply(methodName, [query, modifier, options], applyOpts).then(null, handleUpdateError);

          if (options.waitResult) {
            return result;
          } else {
            result.then(null, function (e) {
              return console.error('Error while calling remote method:', e);
            });
          }
        }

        localUpdate = _get(Object.getPrototypeOf(CollectionManager.prototype), 'update', this).call(this, query, modifier, options);
        return localUpdate;
      }
    }, {
      key: '_handleConnected',
      value: function _handleConnected(reconnected) {
        var _this5 = this;

        var methodName = '/' + this.db.modelName + '/sync';
        return this.db.ids().then(function (ids) {
          return connection.methodManager.apply(methodName, [ids]).result();
        }).then(function (removedIds) {
          return _this5.db.remove({ _id: { $in: removedIds } }, { quiet: true, multi: true });
        });
      }
    }, {
      key: '_handleRemoteAdded',
      value: function _handleRemoteAdded(msg) {
        if (msg.collection === this.db.modelName) {
          delete msg.fields._id;
          return this.db.update({ _id: msg.id }, msg.fields, { quiet: true, upsert: true });
        } else {
          return Promise.resolve();
        }
      }
    }, {
      key: '_handleRemoteChanged',
      value: function _handleRemoteChanged(msg) {
        var _this6 = this;

        if (msg.collection === this.db.modelName) {
          var _ret = function () {
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
              delete msg.fields._id;
              modifier.$set = {};
              (0, _forEach2.default)(msg.fields, function (v, k) {
                modifier.$set[k] = v;
              });
            }

            if ((0, _keys3.default)(modifier).length > 0) {
              return {
                v: _this6.db.update(msg.id, modifier, { quiet: true })
              };
            }
          }();

          if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        } else {
          return Promise.resolve();
        }
      }
    }, {
      key: '_handleRemoteRemoved',
      value: function _handleRemoteRemoved(msg) {
        if (msg.collection === this.db.modelName) {
          return this.db.remove(msg.id, { quiet: true });
        } else {
          return Promise.resolve();
        }
      }
    }]);

    return CollectionManager;
  }(_currentDelegateClass);

  return CollectionManager;
}