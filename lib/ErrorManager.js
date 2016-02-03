import _bind from 'fast.js/function/bind';


/**
 * Manager for handling processing and remote errors.
 * For now it is just print warning in a console.
 */
export default class ErrorManager {
  constructor(connection) {
    this.conn = connection;
    connection.on('message:error', _bind(this._handleError, this));
    connection.on('error', _bind(this._handleError, this));
  }

  _handleError(error) {
    if (error && error.message) {
      console.warn(error.message + '\n' + error.stack);
    } else {
      console.warn(JSON.stringify(error));
    }
  }
}
