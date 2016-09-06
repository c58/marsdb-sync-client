import MethodCall, { CALL_STATUS } from '../../lib/MethodCall';
import Collection from 'marsdb';
import chai, { expect } from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();


describe('MethodCall', function () {
  let conn;
  beforeEach(function () {
    conn = {
      on: sinon.spy(),
      sendMethod: sinon.spy(),
      methodManager: { apply: sinon.spy(() => ({
        result: () => Promise.resolve()
      }))},
    };
  });

  describe('#constructor', function () {
    it('should be pending on create', function () {
      const call = new MethodCall('test', [1,2,3], 0, conn);
      call.isPending.should.be.true;
    });
  });

  describe('#result', function () {
    it('should return promise with result and updated field', function () {
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const res = call.result();
      call._invoke();
      res.should.have.ownProperty('result');
      res.should.have.ownProperty('updated');
      res.should.have.ownProperty('then');
    });

    it('should be resolved once when result event received', function () {
      const cb = sinon.spy();
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const res = call.result().then(cb);
      call._invoke();
      call._handleResult(null, {a: 1});
      call._handleResult(null, {a: 1});
      call._handleResult(null, {a: 1});
      return res.then(() => {
        cb.should.have.callCount(1);
      });
    });

    it('should be reject once with error if error message received', function () {
      const cb = sinon.spy();
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const res = call.result().then(null, cb);
      call._invoke();
      call._handleResult(new Error());
      call._handleResult(new Error());
      call._handleResult(new Error());
      return res.then(() => {
        cb.should.have.callCount(1);
      });
    });

    it('should be resolved immideatilly if method already resulted', function () {
      const cb = sinon.spy();
      const call = new MethodCall('test', [1,2,3], 0, conn);
      call._invoke();
      call._handleResult(null, {a: 1});
      return call.result().should.be.eventually.fulfilled;
    });

    it('should be rejected immideatilly if method already errored', function () {
      const cb = sinon.spy();
      const call = new MethodCall('test', [1,2,3], 0, conn);
      call._invoke();
      call._handleResult(new Error());
      return call.result().should.be.eventually.rejected;
    });

    it('should resolve when result is undefined', () => {
      const cb = sinon.spy();
      const call = new MethodCall('test', [1,2,3], 0, conn);
      call._invoke();
      call._handleResult(null, undefined);
      return call.result().should.be.eventually.fulfilled;
    });
  });

  describe('#updated', function () {
    it('should return promise with result and updated field', function () {
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const upd = call.updated();
      call._invoke();
      upd.should.have.ownProperty('result');
      upd.should.have.ownProperty('updated');
      upd.should.have.ownProperty('then');
    });

    it('should resolved once when updated message received', function () {
      const cb = sinon.spy();
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const upd = call.updated().then(cb);
      call._invoke();
      call._handleUpdated();
      return upd.then(() => {
        cb.should.have.callCount(1);
      });
    });

    it('should be resolved immideatilly if already updated', function () {
      const call = new MethodCall('test', [1,2,3], 0, conn);
      call._invoke();
      call._handleUpdated();
      return call.updated().should.be.eventually.fulfilled;
    });
  });

  describe('#then', function () {
    it('should resolve when updates and resulted', function () {
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const cb = sinon.spy();
      call.then(cb);
      call._handleResult(null, {a: 1});
      cb.should.have.callCount(0);
      return Promise.resolve().then(() => {
        cb.should.have.callCount(0);
        call._handleUpdated();
        cb.should.have.callCount(0);
        return Promise.resolve().then(() => {
          return Promise.resolve().then(() => {
            cb.should.have.callCount(1);
          });
        });
      });
    });
  });
});
