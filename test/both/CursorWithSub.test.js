import SubscriptionManager from '../../lib/SubscriptionManager';
import { createCursorWithSub } from '../../lib/CursorWithSub';
import Collection from 'marsdb';
import chai, { expect } from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();


describe('CursorWithSub', function () {
  let conn, coll;
  beforeEach(() => {
    conn = {
      isConnected: true,
      on: sinon.spy(),
      sendSub: sinon.spy(() => Math.random()),
      sendUnsub: sinon.spy(),
      methodManager: { apply: sinon.spy(() => ({
        result: () => Promise.resolve()
      }))},
    };
    conn.subManager = new SubscriptionManager(conn);
    const cursorClass = createCursorWithSub(conn);
    coll = new Collection('test', { cursorClass });
    return coll.insertAll([
      {a: 1, b: 2, _id: 1},
      {a: 2, b: 3, _id: 2},
    ]);
  })

  it('should start subscription and exec cursor by default', function () {
    const cursor = coll.find({}, {sub: ['testSub']});
    return cursor.observe().then((res) => {
      cursor._subscription.isReadyPending.should.be.true;
      res.should.have.length(2);
    });
  });

  it('should be able to wait until subscription will be ready', function () {
    const cursor = coll.find({}, {sub: ['testSub'], waitReady: true});
    const observer = cursor.observe();
    cursor._doExecute = sinon.spy(() => Promise.resolve([1,2,3]));

    return Promise.resolve().then(() => {
      cursor._doExecute.should.have.callCount(0);
      cursor._subscription.isReadyPending.should.be.true;
      expect(cursor._latestResult).to.be.null;
      conn.subManager._handleSubscriptionReady({
        subs: [cursor._subscription.id]
      });
      cursor._doExecute.should.have.callCount(0);
      return Promise.resolve().then(() => {
        cursor._doExecute.should.have.callCount(1);
        return observer;
      }).then((res) => {
        res.should.be.deep.equal([1,2,3])
      });
    });
  });

  it('should be able to use cache with default behavior - pass', function () {
    const check = (resolveResult) => {
      const cursor = coll.find({}, {sub: ['testSub'], tryCache: true});
      const observer = cursor.observe();
      cursor._doExecute = sinon.spy(() => Promise.resolve(resolveResult));
      return cursor.observe().then((res) => {
        cursor._subscription.isReadyPending.should.be.true;
      });
    };

    return Promise.all([
      check([1,2,3]),
      check({a: 1, b: 3}),
    ]);
  });

  it('should be able to use cache with default behavior - NOT pass', function () {
    const check = (resolveResult) => {
      const cursor = coll.find({}, {sub: ['testSub'], tryCache: true});
      const cb = sinon.spy();
      const observer = cursor.observe(cb);
      cursor._doExecute = sinon.spy(() => Promise.resolve(resolveResult));

      return Promise.resolve().then(() => {
        cursor._doExecute.should.have.callCount(1);
        cursor._subscription.isReadyPending.should.be.true;
        expect(cursor._latestResult).to.be.null;
        conn.subManager._handleSubscriptionReady({
          subs: [cursor._subscription.id]
        });
        cursor._doExecute.should.have.callCount(1);
        return observer;
      }).then(() => {
        cb.should.have.callCount(1);
        cursor._doExecute.should.have.callCount(2);
        cursor._subscription.isReady.should.be.true;
      });
    };

    return Promise.all([
      check([]),
      check({}),
      check(null),
      check(undefined),
    ]);
  });

  it('should be able to use cache with custom behavior', function () {
    const check = (resolveResult) => {
      const cursor = coll.find({}, {sub: ['testSub'], tryCache: () => true});
      const observer = cursor.observe();
      cursor._doExecute = sinon.spy(() => Promise.resolve(resolveResult));
      return cursor.observe().then((res) => {
        cursor._subscription.isReadyPending.should.be.true;
      });
    };

    return Promise.all([
      check(undefined),
      check(null),
      check([]),
      check({}),
    ]);
  });

  it('should stop and remove subscription on stop observing', function () {
    const cursor = coll.find({}, {sub: ['testSub'], waitReady: true});
    const observer = cursor.observe();
    cursor._doExecute = sinon.spy(() => Promise.resolve([1,2,3]));

    return Promise.resolve().then(() => {
      cursor._doExecute.should.have.callCount(0);
      cursor._subscription.isReadyPending.should.be.true;
      expect(cursor._latestResult).to.be.null;
      conn.subManager._handleSubscriptionReady({
        subs: [cursor._subscription.id]
      });
      cursor._doExecute.should.have.callCount(0);
      return Promise.resolve().then(() => {
        cursor._doExecute.should.have.callCount(1);
        return observer;
      }).then((res) => {
        const sub = cursor._subscription;
        observer.stop();
        expect(cursor._subscription).to.be.undefined;
        sub.isStopPending.should.be.true;
      });
    });
  });

  it('should not resubscribe on same subscription on each updated', function () {
    const cursor = coll.find({}, {sub: ['testSub']});
    const observer = cursor.observe();
    return Promise.resolve().then(() => {
      const sub = cursor._subscription;
      return Promise.all([
        coll.insertAll([{a: 10, _id: 10}]),
        cursor.update()
      ]).then(() => {
        sub.should.be.equal(cursor._subscription);
      });
    });
  });
});
