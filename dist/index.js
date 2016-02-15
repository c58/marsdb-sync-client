'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._removeConnection = _removeConnection;
exports.getConnection = getConnection;
exports.addManager = addManager;
exports.call = call;
exports.apply = apply;
exports.subscribe = subscribe;
exports.configure = configure;

var _map2 = require('fast.js/map');

var _map3 = _interopRequireDefault(_map2);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _DDPConnection = require('./DDPConnection');

var _DDPConnection2 = _interopRequireDefault(_DDPConnection);

var _SubscriptionManager = require('./SubscriptionManager');

var _SubscriptionManager2 = _interopRequireDefault(_SubscriptionManager);

var _MethodCallManager = require('./MethodCallManager');

var _MethodCallManager2 = _interopRequireDefault(_MethodCallManager);

var _ErrorManager = require('./ErrorManager');

var _ErrorManager2 = _interopRequireDefault(_ErrorManager);

var _CollectionManager = require('./CollectionManager');

var _CursorWithSub = require('./CursorWithSub');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Collection = typeof window !== 'undefined' && window.Mars ? window.Mars.Collection : require('marsdb').Collection;

// Internals
var _managers = [];
var _connection = null;

function _removeConnection() {
  _connection = null;
}

/**
 * Returns current DDPConnection object or null
 * if connection is not configured
 * @return {DDPConnection}
 */
function getConnection() {
  return _connection;
}

/**
 * Adds manager for ddp connection, that will be created
 * when connection will be established.
 * @param {Class} managerClass
 */
function addManager(managerClass) {
  (0, _invariant2.default)(!_connection, 'addManager(...): you can add managers only at first execution cycle');
  return _managers.push(managerClass);
}

/**
 * Call some remote method
 * @param  {String} methodName
 * @param  {Mixed}  ...params
 * @return {MethodCall}
 */
function call() {
  var _connection$methodMan;

  (0, _invariant2.default)(_connection, 'call(...): connection is not established yet. Please use ' + 'Collection.startup(...) to initialize your app');
  return (_connection$methodMan = _connection.methodManager).call.apply(_connection$methodMan, arguments);
}

/**
 * Apply some remote method
 * @param  {String} methodName
 * @param  {Array}  params
 * @return {MethodCall}
 */
function apply() {
  var _connection$methodMan2;

  (0, _invariant2.default)(_connection, 'apply(...): connection is not established yet. Please use ' + 'Collection.startup(...) to initialize your app');
  return (_connection$methodMan2 = _connection.methodManager).apply.apply(_connection$methodMan2, arguments);
}

/**
 * Subscribe by some publisher with arguments
 * @param  {String} pubName
 * @param  {String} ...args
 * @return {Subscription}
 */
function subscribe() {
  var _connection$subManage;

  (0, _invariant2.default)(_connection, 'subscribe(...): connection is not established yet. Please use ' + 'Collection.startup(...) to initialize your app');
  return (_connection$subManage = _connection.subManager).subscribe.apply(_connection$subManage, arguments);
}

/**
 * Configure application to use MarsSync client.
 * Set high-order cursor and delegate in Collection.
 * Starts up the connection in Collection.startup(...)
 * @param  {String} options.url
 * @param  {Class}  options.socket
 * @return {DDPConnection}
 */
function configure() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  (0, _invariant2.default)(options.socket || typeof WebSocket !== 'undefined', 'configure(...): no socket consturctor provided and not available in global');
  (0, _invariant2.default)(!_connection, 'configure(...): connection already configured');

  options.socket = options.socket || WebSocket;
  _connection = new _DDPConnection2.default(options);
  Collection.defaultDelegate((0, _CollectionManager.createCollectionDelegate)(_connection));
  Collection.defaultCursor((0, _CursorWithSub.createCursorWithSub)(_connection));
  _connection.customManagers = (0, _map3.default)(_managers, function (x) {
    return new x(_connection);
  });
  _connection.subManager = new _SubscriptionManager2.default(_connection);
  _connection.methodManager = new _MethodCallManager2.default(_connection);
  _connection.errorManager = new _ErrorManager2.default(_connection);
  _connection.connect();
  return _connection;
}