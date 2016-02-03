import SubscriptionManager from '../../lib/SubscriptionManager';
import Collection from 'marsdb';
import chai, { expect } from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();


describe('SubscriptionManager', function () {
  let conn, manager;
  beforeEach(function () {
    conn = {
      isConnected: true,
      on: sinon.spy(),
      sendSub: sinon.spy(() => Math.random()),
      sendUnsub: sinon.spy(),
      methodManager: { apply: sinon.spy(() => ({
        result: () => Promise.resolve()
      }))},
    };
    manager = new SubscriptionManager(conn);
  });

  describe('Scubscribe', function() {
    it('should subscribe with given name and params', function() {
      manager.subscribe('test', 1, 2, 3);
      conn.sendSub.should.have.callCount(1);
      conn.sendSub.getCall(0).args[0].should.be.equal('test');
      conn.sendSub.getCall(0).args[1].should.be.deep.equal([1,2,3]);
    });

    it('should not cache cursors by name and params', function() {
      const sub = manager.subscribe('test', 1, 2, 3);
      sub.should.not.be.equals(manager.subscribe('test', 1, 2, 3));
      sub.should.not.be.equals(manager.subscribe('test', 1, 2, 4));
    });

    it('should resubscribe on connected after dicsonnect', function() {
      const sub = manager.subscribe('test', 1, 2, 3);
      manager._handleSubscriptionReady({subs: [sub.id]});
      manager._handleDisconnected();
      conn.isConnected = false;
      conn.sendSub.should.have.callCount(1);
      sub.isFrozen.should.be.true;
      conn.isConnected = true;
      manager._handleConnected();
      conn.sendSub.should.have.callCount(2);
      sub.isFrozen.should.be.false;
      sub.isReadyPending.should.be.true;
    });

    it('should create and freeze sub if conn is disconnected', function() {
      conn.isConnected = false;
      const sub = manager.subscribe('test', 1, 2, 3);
      conn.sendSub.should.have.callCount(0);
      sub.isFrozen.should.be.true;
      conn.isConnected = true;
      manager._handleConnected();
      conn.sendSub.should.have.callCount(1);
      sub.isFrozen.should.be.false;
      sub.isReadyPending.should.be.true;
      manager._handleSubscriptionReady({subs: [sub.id]});
      sub.isReadyPending.should.be.false;
      sub.isReady.should.be.true;
    });

    it('should remove sub from cache on stop', function() {
      const sub = manager.subscribe('test', 1, 2, 3);
      manager._handleSubscriptionReady({subs: [sub.id]});
      sub.stop();
      conn.isConnected = false;
      manager._handleDisconnected();
      expect(manager._subs[sub.id]).to.be.undefined;
      sub.isStopped.should.be.true;
    });

    it('should be unsubscribed on unsub message', function () {
      const sub = manager.subscribe('test', 1, 2, 3);
      manager._handleSubscriptionReady({subs: [sub.id]});
      sub.isReady.should.be.true;
      manager._handleSubscriptionNosub({id: 123});
      manager._handleSubscriptionNosub({});
      sub.isReady.should.be.true;
      manager._handleSubscriptionNosub({id: sub.id});
      sub.isReady.should.be.false;
      sub.isStopped.should.be.true;
    });
  });

  describe('Loading status', function () {
    it('should emit loading on first subscription', function () {
      const cb_loading = sinon.spy();
      const cb_ready = sinon.spy();
      manager.addLoadingListener(cb_loading);
      manager.addReadyListener(cb_ready);
      const sub1 = manager.subscribe('test', 1, 2, 3);
      const sub2 = manager.subscribe('test1', 1, 2, 3);
      const sub3 = manager.subscribe('test2', 1, 2, 4);
      cb_loading.should.have.callCount(1);
      manager._handleSubscriptionReady({subs: [sub1.id, sub2.id]});
      cb_loading.should.have.callCount(1);
      cb_ready.should.have.callCount(0);
      manager._handleSubscriptionReady({subs: [sub3.id]});
      cb_ready.should.have.callCount(1);
    });

    it('should track loading on disconnect', function () {
      const cb_loading = sinon.spy();
      const cb_ready = sinon.spy();
      manager.addLoadingListener(cb_loading);
      manager.addReadyListener(cb_ready);
      const sub1 = manager.subscribe('test', 1, 2, 3);
      const sub2 = manager.subscribe('test1', 1, 2, 3);
      const sub3 = manager.subscribe('test2', 1, 2, 4);
      manager._handleSubscriptionReady({subs: [sub1.id, sub2.id, sub3.id]});
      cb_loading.should.have.callCount(1);
      cb_ready.should.have.callCount(1);
      conn.isConnected = false;
      manager._handleDisconnected();
      cb_loading.should.have.callCount(2);
      cb_ready.should.have.callCount(1);
      conn.isConnected = true;
      manager._handleConnected();
      cb_loading.should.have.callCount(2);
      cb_ready.should.have.callCount(1);
      manager._handleSubscriptionReady({subs: [sub1.id, sub2.id, sub3.id]});
      cb_loading.should.have.callCount(2);
      cb_ready.should.have.callCount(2);
    });

    it('should be able to remove ready and loading listener', function () {
      const cb_loading = sinon.spy();
      const cb_ready = sinon.spy();
      const removeLoading = manager.addLoadingListener(cb_loading);
      const removeReady = manager.addReadyListener(cb_ready);
      const sub1 = manager.subscribe('test', 1, 2, 3);
      cb_loading.should.have.callCount(1);
      cb_ready.should.have.callCount(0);
      manager._handleSubscriptionReady({subs: [sub1.id]});
      cb_loading.should.have.callCount(1);
      cb_ready.should.have.callCount(1);
      removeLoading();
      removeReady();
      const sub2 = manager.subscribe('test1', 1, 2, 3);
      manager._handleSubscriptionReady({subs: [sub2.id]});
      cb_loading.should.have.callCount(1);
      cb_ready.should.have.callCount(1);
    });
  });
});
