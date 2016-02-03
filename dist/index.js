'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getConnection = getConnection;
exports.call = call;
exports.apply = apply;
exports.subscribe = subscribe;
exports.configure = configure;

var _map2 = require('fast.js/map');

var _map3 = _interopRequireDefault(_map2);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _marsdb = require('marsdb');

var _marsdb2 = _interopRequireDefault(_marsdb);

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

// Internals
var _connection = null;

function getConnection() {
  return _connection;
}

function call() {
  var _connection$methodMan;

  (_connection$methodMan = _connection.methodManager).call.apply(_connection$methodMan, arguments);
}

function apply() {
  var _connection$methodMan2;

  (_connection$methodMan2 = _connection.methodManager).apply.apply(_connection$methodMan2, arguments);
}

function subscribe() {
  var _connection$subManage;

  (_connection$subManage = _connection.subManager).subscribe.apply(_connection$subManage, arguments);
}

function configure(_ref) {
  var url = _ref.url;
  var _ref$managers = _ref.managers;
  var managers = _ref$managers === undefined ? [] : _ref$managers;
  var _ref$socket = _ref.socket;
  var socket = _ref$socket === undefined ? WebSocket : _ref$socket;

  (0, _invariant2.default)(!_connection, 'configure(...): connection already configured');

  _connection = new _DDPConnection2.default({ url: url, socket: socket });
  _connection.subManager = new _SubscriptionManager2.default(_connection);
  _connection.methodManager = new _MethodCallManager2.default(_connection);
  _connection.errorManager = new _ErrorManager2.default(_connection);
  _connection.customManagers = (0, _map3.default)(managers, function (x) {
    return new x(_connection);
  });
  _marsdb2.default.defaultDelegate((0, _CollectionManager.createCollectionDelegate)(_connection));
  _marsdb2.default.defaultCursor((0, _CursorWithSub.createCursorWithSub)(_connection));
  return _connection;
}