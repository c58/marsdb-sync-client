import Subscription from '../../lib/Subscription';
import Collection from 'marsdb';
import chai, { expect } from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();


describe('Subscription', function () {
  let conn;
  beforeEach(function () {
    conn = {
      on: sinon.spy(),
      sendSub: sinon.spy(() => Math.random()),
      sendUnsub: sinon.spy(),
      methodManager: { apply: sinon.spy(() => ({
        result: () => Promise.resolve()
      }))},
    };
  });

  describe('#ready', function () {
    it('should be resolved when ready message received', function () {
      const sub = new Subscription('test', [1,2,3], conn);
      sub.isReady.should.be.false;
      const readyPromise = sub.ready().then(() => {
        sub.isReady.should.be.true;
      });
      sub._handleReady();
      return readyPromise;
    });

    it('should be rejected when error message received', function () {
      const sub = new Subscription('test', [1,2,3], conn);
      sub.isReady.should.be.false;
      const readyPromise = sub.ready().then(null, () => {
        sub.isFaulted.should.be.true;
      });
      sub._handleNosub({error: {a: 1}});
      return readyPromise;
    });

    it('should return promise with ready and stopped fields', function () {
      const sub = new Subscription('test', [1,2,3], conn);
      const promise = sub.ready();
      promise.should.have.ownProperty('then');
      promise.should.have.ownProperty('ready');
      promise.should.have.ownProperty('stopped');
    });

    it('should resolve immediately if already ready', function() {
      const sub = new Subscription('test', [1,2,3], conn);
      sub._handleReady();
      return sub.ready().then(() => {
        return Promise.resolve();
      });
    });
  });

  describe('#stopped', function () {
    it('should be resolved when subscription stopped', function() {
      const sub = new Subscription('test', [1,2,3], conn);
      const promise = sub.stopped().then(null, () => {
        sub.isStopped.should.be.true;
      });
      sub._stopImmediately();
      return promise;
    });

    it('should resolve immediately if already stopped', function() {
      const sub = new Subscription('test', [1,2,3], conn);
      sub._handleReady();
      sub._stopImmediately();
      return sub.stopped().then(() => {
        return Promise.resolve();
      });
    });

    it('should return promise with ready and stopped fields', function () {
      const sub = new Subscription('test', [1,2,3], conn);
      const promise = sub.stopped();
      promise.should.have.ownProperty('then');
      promise.should.have.ownProperty('ready');
      promise.should.have.ownProperty('stopped');
    });
  });

  describe('#stop', function () {
    it('should schedule stop subscription', function() {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._handleReady();
      sub.stop();
      expect(sub._stopTimer).to.be.not.undefined;
      return sub.stopped().then(() => {
        conn.sendUnsub.should.have.callCount(1);
        expect(conn.sendUnsub.getCall(0).args[0]).to.be.equal(sub.id);
      });
    });

    it('should stop only if not stop pending or stopped', function() {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._handleReady();
      sub._stopImmediately();
      expect(sub._stopTimer).to.be.not.undefined;
      sub.stop();
      expect(sub._stopTimer).to.be.not.undefined;
    });

    it('should not restop on delay if already stopped', function() {
      const sub = new Subscription('test', [1,2,3], conn, 10);
      sub.stop();
      sub._stopImmediately();
      sub._clearStopper = sinon.spy();
      sub._stopImmediately();
      sub._clearStopper.should.have.callCount(0);
    });

    it('should not send unsub message if options.dontSendMsg passed', function() {
      const sub = new Subscription('test', [1,2,3], conn, 10);
      sub._stopImmediately({dontSendMsg: true});
      conn.sendUnsub.should.have.callCount(0);
    });
  });

  describe('Situations', function () {
    it('should delay stop of subscription subscription', function () {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._handleReady();
      sub.stop();
      sub.isStopPending.should.be.true;
      return sub.stopped();
    });

    it('should resume subscription if it is waiting stop', function () {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._handleReady();
      sub.stop();
      sub.isStopPending.should.be.true;
      sub._subscribe();
      sub.isStopPending.should.be.false;
      sub.isStopped.should.be.false;
      sub.isReady.should.be.true;
      return sub.ready();
    });

    it('should resubscribe if subscription is frozen on reconnect', function () {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._handleReady();
      sub._freeze();
      sub.isFrozen.should.be.true;
      conn.sendSub.should.have.callCount(0);
      sub._subscribe();
      sub.isFrozen.should.be.false;
      conn.sendSub.should.have.callCount(1);
    });

    it('should wait for sub ready on resubscribe while stop pending', function() {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._subscribe();
      conn.sendSub.should.have.callCount(1);
      sub.isReadyPending.should.be.true;
      sub.stop();
      sub.isStopPending.should.be.true;
      sub.isReadyPending.should.be.false;
      sub._subscribe();
      sub.isReadyPending.should.be.true;
      sub.isStopPending.should.be.false;
    });

    it('should freeze subscriptions on disconnect and stop subs with stop pending', function () {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub.stop();
      sub.isStopPending.should.be.true;
      sub._freeze();
      sub.isFrozen.should.be.false;
      sub.isStopped.should.be.true;
    });

    it('should not make new sub if sub is waiting for ready', function () {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._subscribe();
      conn.sendSub.should.have.callCount(1);
      sub._subscribe();
      sub._subscribe();
      sub._subscribe();
      conn.sendSub.should.have.callCount(1);
    });

    it('should make new sub if sub is stopped', function () {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._subscribe();
      conn.sendSub.should.have.callCount(1);
      sub._handleReady();
      sub._stopImmediately();
      sub.isStopped.should.be.true;
      sub._subscribe();
      conn.sendSub.should.have.callCount(2);
      sub.isStopped.should.be.false;
      sub.isReadyPending.should.be.true;
    });

    it('should not freeze if sub stopped', function() {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._stopImmediately();
      sub._freeze();
      sub.isStopped.should.be.true;
      sub.isFrozen.should.be.false;
    });

    it('should immediately stop on unsub message', function() {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._subscribe();
      sub._handleReady();
      sub.isStopped.should.be.false;
      sub.isReady.should.be.true;
      sub._handleNosub();
      sub.isStopped.should.be.true;
      sub.isReady.should.be.false;
    });

    it('should emit ready if not stopped or stop pending', function() {
      const sub = new Subscription('test', [1,2,3], conn, 50);
      sub._subscribe();
      sub._stopImmediately();
      sub.emit = sinon.spy();
      sub._handleReady();
      sub.emit.should.have.callCount(0);
    });
  });

});
