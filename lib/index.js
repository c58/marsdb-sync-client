import _map from 'fast.js/map';
import invariant from 'invariant';
import Collection from 'marsdb';
import DDPConnection from './DDPConnection';
import SubscriptionManager from './SubscriptionManager';
import MethodCallManager from './MethodCallManager';
import ErrorManager from './ErrorManager';
import { createCollectionDelegate } from './CollectionManager';
import { createCursorWithSub } from './CursorWithSub';


// Internals
let _connection = null;

export function getConnection() {
  return _connection;
}

export function call(...args) {
  _connection.methodManager.call(...args);
}

export function apply(...args) {
  _connection.methodManager.apply(...args);
}

export function subscribe(...args) {
  _connection.subManager.subscribe(...args);
}

export function configure({ url, managers = [], socket = WebSocket }) {
  invariant(
    !_connection,
    'configure(...): connection already configured'
  );

  _connection = new DDPConnection({ url, socket });
  _connection.subManager = new SubscriptionManager(_connection);
  _connection.methodManager = new MethodCallManager(_connection);
  _connection.errorManager = new ErrorManager(_connection);
  _connection.customManagers = _map(managers, x => new x(_connection));
  Collection.defaultDelegate(createCollectionDelegate(_connection));
  Collection.defaultCursor(createCursorWithSub(_connection));
  return _connection;
}
