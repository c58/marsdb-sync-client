import _keys from 'fast.js/object/keys';
const Collection = typeof window !== 'undefined' && window.Mars
  ? window.Mars.Collection : require('marsdb').Collection;


// Internals
export function _isCacheValid(tryCache, result) {
  let resolveCache = false;
  if (typeof tryCache === 'function') {
    resolveCache = tryCache(result);
  } else if (
    (Array.isArray(result) && result.length > 0) ||
    (Object.prototype.toString.call(result) === '[object Object]'
      && _keys(result).length > 0)
  ) {
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
export function createCursorWithSub(connection) {
  const _currentCursorClass = Collection.defaultCursor();

  /**
   * Cursor that automatically subscribe and unsubscribe
   * on cursor observing statred/stopped.
   */
  class CursorWithSub extends _currentCursorClass {
    _doUpdate(firstRun) {
      const { sub, waitReady, tryCache, keepSub } = this.options;
      const superUpdate = () => super._doUpdate(firstRun);

      // When subscription is not initiated
      if (!this._subscription && sub) {
        this._subscription = connection.subManager.subscribe(...sub);

        if (!keepSub) {
          this.once('observeStopped', () => {
            this._subscription.stop();
            delete this._subscription;
          });
        }

        if (waitReady) {
          return this._subscription.ready().then(superUpdate);
        } else if (tryCache) {
          return this.exec().then(result => {
            if (_isCacheValid(tryCache, result)) {
              this._updateLatestIds();
              return this._propagateUpdate(firstRun)
                .then(() => result);
            } else {
              return this._subscription.ready().then(superUpdate);
            }
          });
        }
      }

      // When subscription initiated but not ready
      // (this case is used when cached result is used)
      if (this._subscription && !this._subscription.isReady) {
        return this._subscription.ready().then(superUpdate);
      }

      return superUpdate();
    }
  }

  return CursorWithSub;
}
