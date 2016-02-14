import _map from 'fast.js/map';
import invariant from 'invariant';
import DDPConnection from './DDPConnection';
import SubscriptionManager from './SubscriptionManager';
import MethodCallManager from './MethodCallManager';
import ErrorManager from './ErrorManager';
import { createCollectionDelegate } from './CollectionManager';
import { createCursorWithSub } from './CursorWithSub';
const Collection = typeof window !== 'undefined' && window.Mars
  ? window.Mars.Collection : require('marsdb').Collection;

// Internals
const _managers = [];
let _connection = null;


/**
 * Returns current DDPConnection object or null
 * if connection is not configured
 * @return {DDPConnection}
 */
export function getConnection() {
  return _connection;
}

/**
 * Adds manager for ddp connection, that will be created
 * when connection will be established.
 * @param {Class} managerClass
 */
export function addManager(managerClass) {
  invariant(
    !_connection,
    'addManager(...): you can add managers only at first execution cycle'
  );
  return _managers.push(managerClass);
}

/**
 * Call some remote method
 * @param  {String} methodName
 * @param  {Mixed}  ...params
 * @return {MethodCall}
 */
export function call(...args) {
  invariant(
    !_connection,
    'call(...): connection is not established yet. Please use ' +
    'Collection.startup(...) to initialize your app'
  );
  return _connection.methodManager.call(...args);
}

/**
 * Apply some remote method
 * @param  {String} methodName
 * @param  {Array}  params
 * @return {MethodCall}
 */
export function apply(...args) {
  invariant(
    !_connection,
    'apply(...): connection is not established yet. Please use ' +
    'Collection.startup(...) to initialize your app'
  );
  return _connection.methodManager.apply(...args);
}

/**
 * Subscribe by some publisher with arguments
 * @param  {String} pubName
 * @param  {String} ...args
 * @return {Subscription}
 */
export function subscribe(...args) {
  invariant(
    !_connection,
    'subscribe(...): connection is not established yet. Please use ' +
    'Collection.startup(...) to initialize your app'
  );
  return _connection.subManager.subscribe(...args);
}

/**
 * Configure application to use MarsSync client.
 * Set high-order cursor and delegate in Collection.
 * Starts up the connection in Collection.startup(...)
 * @param  {String} options.url
 * @param  {Class}  options.socket
 * @return {DDPConnection}
 */
export function configure({ url, socket }) {
  invariant(
    socket || typeof WebSocket !== 'undefined',
    'configure(...): no socket consturctor provided and not available in global'
  );
  invariant(
    !_configured,
    'configure(...): connection already configured'
  );

  socket = socket || WebSocket;
  _connection = new DDPConnection({ url, socket });
  Collection.defaultDelegate(createCollectionDelegate(_connection));
  Collection.defaultCursor(createCursorWithSub(_connection));
  Collection.startup(() => {
    _connection.customManagers = _map(_managers, x => new x(_connection));
    _connection.subManager = new SubscriptionManager(_connection);
    _connection.methodManager = new MethodCallManager(_connection);
    _connection.errorManager = new ErrorManager(_connection);
    _connection.connect();
  });

  return _connection;
}
