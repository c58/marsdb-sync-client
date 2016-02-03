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
    it('should send method message', function () {
      const call = new MethodCall('test', [1,2,3], 0, conn);
      call.id.should.have.length(20);
      conn.sendMethod.should.have.callCount(1);
      conn.sendMethod.getCall(0).args.should.be.deep.equal(
        ['test', [1,2,3], call.id, 0]
      );

    });
  });

  describe('#result', function () {
    it('should return promise with result and updated field', function () {
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const res = call.result();
      res.should.have.ownProperty('result');
      res.should.have.ownProperty('updated');
      res.should.have.ownProperty('then');
    });

    it('should be resolved once when result event received', function () {
      const cb = sinon.spy();
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const res = call.result().then(cb);
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
      call._handleResult(null, {a: 1});
      return call.result().should.be.eventually.fulfilled;
    });

    it('should be rejected immideatilly if method already errored', function () {
      const cb = sinon.spy();
      const call = new MethodCall('test', [1,2,3], 0, conn);
      call._handleResult(new Error());
      return call.result().should.be.eventually.rejecte;
    });
  });

  describe('#updated', function () {
    it('should return promise with result and updated field', function () {
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const upd = call.updated();
      upd.should.have.ownProperty('result');
      upd.should.have.ownProperty('updated');
      upd.should.have.ownProperty('then');
    });

    it('should resolved once when updated message received', function () {
      const cb = sinon.spy();
      const call = new MethodCall('test', [1,2,3], 0, conn);
      const upd = call.updated().then(cb);
      call._handleUpdated();
      return upd.then(() => {
        cb.should.have.callCount(1);
      });
    });

    it('should be resolved immideatilly if already updated', function () {
      const call = new MethodCall('test', [1,2,3], 0, conn);
      call._handleUpdated();
      return call.updated().should.be.eventually.fulfilled;
    });
  });
});
