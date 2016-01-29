import { EJSON, EventEmitter } from 'marsdb';
import sha256 from 'js-sha256';
import invariant from 'invariant';


export class Accounts extends EventEmitter {
  // @ngInject
  constructor(Mars, DDP) {
    super();
    this.Mars = Mars;
    this.DDP = DDP;
    this.userId = null;

    this._tryRestoreFromStorage();
    this._catchReconnection();
  }

  callLoginMethod(options) {
    options = Object.assign({
      methodName: 'login',
      methodArguments: [{}],
      _suppressLoggingIn: false,
    }, options);

    // Set defaults for callback arguments to no-op functions; make sure we
    // override falsey values too.
    for (const f of ['validateResult', 'userCallback']) {
      if (!options[f]) {
        options[f] = function() {};
      }
    }

    // Call callback with error form server
    const failedLoginHandler = (err) => {
      if (this.userId) {
        this.makeClientLoggedOut();
      }
      options.userCallback(new Error('Failed to login', err));
    };

    // Validate success result and call calback
    const successLoginHandler = (res) => {
      if (res && res.id && res.token && res.tokenExpires) {
        this.makeClientLoggedIn(res.id, res.token, res.tokenExpires);
        options.userCallback();
      } else {
        failedLoginHandler(new Error('Returned invalid result', res));
      }
    };

    return this.Mars.apply(options.methodName, options.methodArguments)
      .result().then(successLoginHandler, failedLoginHandler);
  }

  loginWithToken(token, callback) {
    return this.callLoginMethod({
      methodArguments: [{
        resume: token,
      }],
      userCallback: callback,
    });
  }

  createUser(options, callback) {
    invariant(
      options && options.password && typeof options.password === 'string',
      'Password may not be empty'
    );

    // Replace password with the hashed password.
    options = Object.assign({}, options);
    options.password = this._hashPassword(options.password);

    return this.callLoginMethod({
      methodName: 'createUser',
      methodArguments: [options],
      userCallback: callback,
    });
  }

  resetPassword(token, newPassword, callback) {
    invariant(
      newPassword,
      'Password may not be empty'
    );

    return this.callLoginMethod({
      methodName: 'resetPassword',
      methodArguments: [token, this._hashPassword(newPassword)],
      userCallback: callback,
    });
  }

  verifyEmail(token, callback) {
    invariant(
      token,
      'Need to pass token'
    );

    return this.callLoginMethod({
      methodName: 'verifyEmail',
      methodArguments: [token],
      userCallback: callback,
    });
  }

  loginWithPassword(selector, password, callback) {
    if (typeof selector === 'string') {
      if (selector.indexOf('@') === -1) {
        selector = {username: selector};
      } else {
        selector = {email: selector};
      }
    }

    this.callLoginMethod({
      methodArguments: [{
        user: selector,
        password: this._hashPassword(password),
      }],
      userCallback: callback,
    });
  }

  forgotPassword(options) {
    invariant(
      options && options.email,
      'Must pass options.email'
    );

    return this.Mars.call('forgotPassword', options);
  }

  logout() {
    this.makeClientLoggedOut();
    return this.Mars.apply('logout', []);
  }

  changePassword(oldPassword, newPassword) {
    invariant(
      this.userId,
      'Must be logged in to change password.'
    );
    invariant(
      newPassword && typeof newPassword != 'string',
      'Password may not be empty'
    );

    const oldPassHash = oldPassword ? this._hashPassword(oldPassword) : null;
    const newPassHash = this._hashPassword(newPassword);

    return this.Mars.apply('changePassword', [oldPassHash, newPassHash]);
  }

  makeClientLoggedIn(id, token, tokenExpires) {
    this.userId = id;
    this._fillAccountStorage(id, token, tokenExpires);
    this.emit('loggedIn', id, token, tokenExpires);
  }

  makeClientLoggedOut() {
    const loggedOutId = this.userId;
    this.userId = null;
    this._cleanupAccountStorage();
    this.emit('loggedOut', loggedOutId);
  }

  _tryRestoreFromStorage() {
    const accStorage = this._getAccountStorage();
    const nowDate = new Date();

    if (accStorage.userId && accStorage.loginToken &&
        accStorage.loginTokenExpires instanceof Date &&
        accStorage.loginTokenExpires.getTime() > nowDate.getTime()) {
      this.userId = accStorage.userId;
      this.loginWithToken(accStorage.loginToken);
    } else {
      this._cleanupAccountStorage();
    }
  }

  _catchReconnection() {
    this.DDP.on('connected', (reconnected) => {
      if (reconnected) {
        this._tryRestoreFromStorage();
      }
    });
  }

  _getAccountStorage() {
    return {
      userId: localStorage.getItem('Accounts.userId'),
      loginToken: localStorage.getItem('Accounts.autoLoginToken'),
      loginTokenExpires: EJSON.parse(localStorage.getItem('Accounts.autoLoginTokenExpires')+''),
    };
  }

  _cleanupAccountStorage() {
    localStorage.removeItem('Accounts.userId');
    localStorage.removeItem('Accounts.autoLoginToken');
    localStorage.removeItem('Accounts.autoLoginTokenExpires');
  }

  _fillAccountStorage(id, token, tokenExpires) {
    localStorage.setItem('Accounts.userId', id);
    localStorage.setItem('Accounts.autoLoginToken', token);
    localStorage.setItem('Accounts.autoLoginTokenExpires', EJSON.stringify(tokenExpires));
  }

  _hashPassword(password) {
    return {
      digest: sha256(password),
      algorithm: 'sha-256',
    };
  }
}
