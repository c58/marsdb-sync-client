import { Collection } from 'marsdb';


export function createCursorWithSub(connection) {
  const _currentCursorClass = Collection.defaultCursor();

  /**
   * Cursor that automatically subscribe and unsubscribe
   * on cursor observing statred/stopped.
   */
  class CursorWithSub extends _currentCursorClass {
    constructor(...args) {
      super(...args)
    }

    _doUpdate(...args) {
      const { sub } = this.options;

      if (!this._subscription && sub) {
        this._subscription = connection.subManager.subscribe(...sub);

        this.once('observeStopped', () => {
          this._subscription.stop();
          delete this._subscription;
        });

        return this._subscription.ready()
          .then(() => super._doUpdate(...args));
      } else {
        return super._doUpdate(...args);
      }
    }
  }

  return CursorWithSub;
}
