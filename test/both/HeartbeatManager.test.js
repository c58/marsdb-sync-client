import HeartbeatManager from '../../lib/HeartbeatManager';
import { Collection, Random } from 'marsdb';
import chai, {expect} from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();


describe('HeartbeatManager', function () {
  let clock, hb, cbPing, cbPong, cbTimeout;
  beforeEach(function () {
    clock = sinon.useFakeTimers();
    hb = new HeartbeatManager(20, 10);
    cbPing = sinon.spy();
    cbPong = sinon.spy();
    cbTimeout = sinon.spy();
    hb.on('sendPing', cbPing);
    hb.on('sendPong', cbPong);
    hb.on('timeout', cbTimeout);
  });
  afterEach(function () {
    clock.restore();
  });

  describe('#consturctor', function () {
    it('should set default wait time', function () {
      const newhb = new HeartbeatManager();
      expect(newhb.pingTimeout).to.be.gt(0);
      expect(newhb.pongTimeout).to.be.gt(0);
    });
  });

  describe('#waitPing', function () {
    it('should wait ping message and send ping on timeout', function () {
      hb.waitPong = sinon.spy();
      hb.waitPing();
      cbPing.should.have.callCount(0);
      cbPong.should.have.callCount(0);
      cbTimeout.should.have.callCount(0);
      hb.waitPong.should.have.callCount(0);
      clock.tick(19);
      cbPing.should.have.callCount(0);
      cbPong.should.have.callCount(0);
      cbTimeout.should.have.callCount(0);
      hb.waitPong.should.have.callCount(0);
      clock.tick(21);
      cbPing.should.have.callCount(1);
      cbPong.should.have.callCount(0);
      cbTimeout.should.have.callCount(0);
      hb.waitPong.should.have.callCount(1);
    });

    it('should clear all timers', function () {
      hb._clearTimers = sinon.spy();
      hb.waitPing();
      hb._clearTimers.should.have.callCount(1);
    });
  });

  describe('#waitPong', function () {
    it('should wait pong message and emit `timeout` on timeout', function () {
      hb.waitPong();
      cbPing.should.have.callCount(0);
      cbPong.should.have.callCount(0);
      cbTimeout.should.have.callCount(0);
      clock.tick(9);
      cbPing.should.have.callCount(0);
      cbPong.should.have.callCount(0);
      cbTimeout.should.have.callCount(0);
      clock.tick(11);
      cbPing.should.have.callCount(0);
      cbPong.should.have.callCount(0);
      cbTimeout.should.have.callCount(1);
    });

    it('should clear all timers', function () {
      hb._clearTimers = sinon.spy();
      hb.waitPong();
      hb._clearTimers.should.have.callCount(1);
    });
  });

  describe('#handlePing', function () {
    it('should send pong message with same id and wait ping', function () {
      hb.waitPing = sinon.spy();
      hb.handlePing('123');
      cbPing.should.have.callCount(0);
      cbPong.should.have.callCount(1);
      cbTimeout.should.have.callCount(0);
      hb.waitPing.should.have.callCount(1);
      cbPong.getCall(0).args[0].should.be.equal('123');
    });

    it('should clear all timers', function () {
      hb._clearTimers = sinon.spy();
      hb.handlePing();
      hb._clearTimers.should.have.callCount(2);
    });
  });

  describe('#handlePong', function () {
    it('should wait ping', function () {
      hb.waitPing = sinon.spy();
      hb.handlePong();
      cbPing.should.have.callCount(0);
      cbPong.should.have.callCount(0);
      cbTimeout.should.have.callCount(0);
      hb.waitPing.should.have.callCount(1);
    });

    it('should clear all timers', function () {
      hb._clearTimers = sinon.spy();
      hb.handlePong();
      hb._clearTimers.should.have.callCount(2);
    });
  });
});
