import MethodCallManager from '../../lib/MethodCallManager';
import Collection from 'marsdb';
import chai, { expect } from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();


describe('MethodCallManager', function () {
  let conn;
  beforeEach(function () {
    conn = {
      isConnected: true,
      on: sinon.spy(),
      sendMethod: sinon.spy(),
      methodManager: { apply: sinon.spy(() => ({
        result: () => Promise.resolve()
      }))},
    };
  });

  describe('call', function () {
    it('should call apply with a list of parameters', function () {
      const manager = new MethodCallManager(conn);
      manager.apply = sinon.spy();
      manager.call('test', 1, 2, 3);
      manager.apply.should.have.callCount(1);
      manager.apply.getCall(0).args.should.be.deep.equal(['test', [1,2,3]]);
    });
  });

  describe('apply', function () {
    it('should make a call and wait for result', function () {
      const manager = new MethodCallManager(conn);
      const call = manager.apply('test', [1,2,3], {randomSeed: 10});
      conn.sendMethod.should.have.callCount(1);
      conn.sendMethod.getCall(0).args.should.be.deep.equal([
        'test', [1,2,3], call.id, 10
      ]);
      manager._handleMethodResult({id: call.id, result: {a: 1}});
      manager._handleMethodUpdated({methods: [call.id]})
      return Promise.all([call.result(), call.updated()]).then((res) => {
        res[0].should.be.deep.equal({a: 1});
      });
    });

    it('should ignore result for unknown method without errors', function () {
      const manager = new MethodCallManager(conn);
      manager._handleMethodResult({id: '123', result: {a: 1}});
      manager._handleMethodUpdated({methods: ['321']});
    });

    it('should reject result with error', function () {
      const manager = new MethodCallManager(conn);
      const call = manager.apply('test', [1,2,3], 10);
      manager._handleMethodResult({id: call.id, error: {text: '123'}});
      return call.result().should.be.eventually.rejected;
    });

    it('should prefere error and reject result with error', function () {
      const manager = new MethodCallManager(conn);
      const call = manager.apply('test', [1,2,3], 10);
      manager._handleMethodResult({id: call.id, result: {a: 1}, error: {text: '123'}});
      return call.result().should.be.eventually.rejected;
    });

    it('should reject not pending methods on disconnect', function () {
      const manager = new MethodCallManager(conn);
      const call1 = manager.apply('test', [1,2,3], 10);
      const call2 = manager.apply('test1', [1,2,3], 10);
      const call3 = manager.apply('test2', [1,2,3], 10);
      conn.isConnected = false;
      const call4 = manager.apply('test3', [1,2,3], 10);
      manager._handleDisconnected();
      return Promise.all([
        call1.result().should.be.eventually.rejected,
        call2.result().should.be.eventually.rejected,
        call3.result().should.be.eventually.rejected,
      ]).then(() => {
        call1.isDone.should.be.true;
        call2.isDone.should.be.true;
        call3.isDone.should.be.true;
        call4.isDone.should.be.false;
        call4.isPending.should.be.true;
        manager._handleDisconnected();
        call4.isPending.should.be.true;
        manager._handleConnected();
        call4.isPending.should.be.false;
        call4.isSent.should.be.true;
        manager._handleDisconnected();
        call4.isSent.should.be.false;
        call4.isDone.should.be.true;
      });
    });

    it('should accept no params and no random seed', function () {
      const manager = new MethodCallManager(conn);
      const call = manager.apply('test');
      conn.sendMethod.should.have.callCount(1);
      conn.sendMethod.getCall(0).args.should.be.deep.equal([
        'test', [], call.id, undefined
      ]);
    });

    it('should wait untill connected', function () {
      conn.isConnected = false;
      const manager = new MethodCallManager(conn);
      const call = manager.apply('test');
      call.isPending.should.be.true;
      const handler = conn.on.getCall(1).args[1];
      handler();
      call.isPending.should.be.false;
      call.isSent.should.be.true;
    });

    it('should resend method if disconnected on sent state', function () {
      const manager = new MethodCallManager(conn);
      const call = manager.apply('test', [], {retryOnDisconnect:true});
      call.isSent.should.be.true;
      manager._handleDisconnected();
      call.isPending.should.be.true;
      call.isSent.should.be.false;
      manager._handleConnected();
      call.isPending.should.be.false;
      call.isSent.should.be.true;
    });
  });
});
