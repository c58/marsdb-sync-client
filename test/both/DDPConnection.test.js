import DDPConnection, { CONN_STATUS } from '../../lib/DDPConnection';
import { EJSON } from 'marsdb';
import chai, { expect } from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();


const WebScoketMock = function(url) {
  return {
    url: url,
    send: sinon.spy(),
    close: sinon.spy(),
  };
};

describe('DDPConnection', function () {
  let conn, clock;
  beforeEach(function () {
    clock = sinon.useFakeTimers();
    conn = new DDPConnection({
      url: 'test',
      socket: WebScoketMock,
    });
  });
  afterEach(function() {
    clock.restore();
  })

  describe('#constructor', function () {
    it('should use default WebSocket and autoreconnect', function () {
      if (typeof WebSocket === 'undefined') {
        global.WebSocket = function() {};
      }
      const anotherConn = new DDPConnection({url: 'test'});
      anotherConn._autoReconnect.should.be.true;
      anotherConn._socket.should.not.be.undefined;
      const withoutReconn = new DDPConnection({url: 'test', autoReconnect: false});
      withoutReconn._autoReconnect.should.be.false;
    });
  });

  describe('Senders', function () {
    describe('#sendSub', function () {
      it('should send sub message', function () {
        conn.sendSub('test', [1,2,3], 'some_id');
        conn._rawConn.send.should.have.callCount(1);
        EJSON.parse(conn._rawConn.send.getCall(0).args[0]).should.be.deep.equal({
          msg: 'sub', id: 'some_id', params: [1,2,3], name: 'test'
        });
      });
      it('should accept no parameters', function () {
        conn.sendSub('test', undefined, 'some_id');
        conn._rawConn.send.should.have.callCount(1);
        EJSON.parse(conn._rawConn.send.getCall(0).args[0]).should.be.deep.equal({
          msg: 'sub', id: 'some_id', params: [], name: 'test'
        });
      });
    });

    describe('#sendUnsub', function () {
      it('should send unsub message', function () {
        conn.sendUnsub('some_id');
        conn._rawConn.send.should.have.callCount(1);
        EJSON.parse(conn._rawConn.send.getCall(0).args[0]).should.be.deep.equal({
          msg: 'unsub', id: 'some_id'
        });
      });
    });

    describe('#sendMethod', function () {
      it('should send method message', function () {
        conn.sendMethod('some_method', [1,2,3], 'some_id', 10);
        conn._rawConn.send.should.have.callCount(1);
        EJSON.parse(conn._rawConn.send.getCall(0).args[0]).should.be.deep.equal({
          msg: 'method', id: 'some_id', params: [1,2,3], randomSeed: 10,
          method: 'some_method'
        });
      });
      it('should accept no params and no seed', function () {
        conn.sendMethod('some_method', undefined, 'some_id');
        conn._rawConn.send.should.have.callCount(1);
        EJSON.parse(conn._rawConn.send.getCall(0).args[0]).should.be.deep.equal({
          msg: 'method', id: 'some_id', params: [],
          method: 'some_method'
        });
      });
    });

    describe('#sendPing', function () {
      it('should send ping message', function () {
        conn.sendPing();
        conn._rawConn.send.should.have.callCount(1);
        const sent = EJSON.parse(conn._rawConn.send.getCall(0).args[0]);
        sent.msg.should.be.equal('ping');
        sent.should.have.ownProperty('id');
        sent.id.should.have.length(20);
      });
    });

    describe('#sendPong', function () {
      it('should send ping message', function () {
        conn.sendPong('123');
        conn._rawConn.send.should.have.callCount(1);
        EJSON.parse(conn._rawConn.send.getCall(0).args[0]).should.be.deep.equal({
          msg: 'pong', id: '123'
        });
      });
    });
  });

  describe('Connection/reconnection', function () {
    it('should connectin in constructor', function () {
      conn._status.should.be.equal(CONN_STATUS.CONNECTING);
      conn._rawConn.onopen();
      conn._rawConn.send.should.have.callCount(1);
      EJSON.parse(conn._rawConn.send.getCall(0).args[0]).should.be.deep.equal({
        msg: 'connect', session: null, version: 1, support: [1]
      });
      conn._status.should.be.equal(CONN_STATUS.CONNECTING);
      conn._handleConnectedMessage({msg: 'connected', session: '123'})
      conn._status.should.be.equal(CONN_STATUS.CONNECTED);
      conn.isConnected.should.be.true;
    });
    it('should reconnectin automatically by default', function () {
      conn._handleConnectedMessage({msg: 'connected', session: '123'})
      conn._status.should.be.equal(CONN_STATUS.CONNECTED);
      conn.reconnect = sinon.spy();
      conn._rawConn.onclose();
      conn.reconnect.should.have.callCount(1);
      conn._autoReconnect = false;
      conn._handleConnectedMessage({msg: 'connected', session: '123'})
      conn._rawConn.onclose();
      conn.reconnect.should.have.callCount(1);
    });
    it('should connect only if disconnected', function () {
      const oldRawConn = conn._rawConn;
      conn._handleConnectedMessage({msg: 'connected', session: '123'})
      conn.connect();
      conn._rawConn.should.be.equal(oldRawConn);
      conn._rawConn.onclose();
      conn.connect().should.be.true;
      conn.connect().should.be.false;
    });
    it('should properly reconnect after delay with stopping heartbeat', function () {
      conn._rawConn.onclose();
      conn.isDisconnected.should.be.true;
      const func = conn.reconnect();
      expect(func).to.be.a('function');
      conn.isDisconnected.should.be.true;
      conn._status.should.not.be.equal(CONN_STATUS.CONNECTING);
      clock.tick(6000);
      conn._status.should.be.equal(CONN_STATUS.CONNECTING);
      conn.connect().should.be.false;
      clock.tick(0);
      conn._rawConn.onclose();
      conn.isDisconnected.should.be.true;
      conn._status.should.not.be.equal(CONN_STATUS.CONNECTING);
      clock.tick(6000);
      conn._status.should.be.equal(CONN_STATUS.CONNECTING);
    });
    it('should be able to cancel reconnecting', function () {
      conn._rawConn.onclose();
      conn.isDisconnected.should.be.true;
      const func = conn.reconnect();
      expect(func).to.be.a('function');
      func();
      conn._status.should.not.be.equal(CONN_STATUS.CONNECTING);
      clock.tick(6000);
      conn._status.should.not.be.equal(CONN_STATUS.CONNECTING);
      conn.isDisconnected.should.be.true;
    });
    it('should not reconnect if connected or connecting', function () {
      conn._status.should.be.equal(CONN_STATUS.CONNECTING);
      expect(conn.reconnect()).to.be.undefined;
    });
    it('should process connected message only if not connected', function () {
      conn._handleConnectedMessage({msg: 'connected', session: '123'})
      conn._sessionId.should.be.equal('123');
      conn._handleConnectedMessage({msg: 'connected', session: '321'})
      conn._sessionId.should.be.equal('123');
    });
    it('should disconnect on hertbeat timeout', function () {
      conn._rawConn.onopen();
      conn._rawConn.send.should.have.callCount(1);
      conn._handleConnectedMessage({msg: 'connected', session: '123'})
      conn._rawConn.close.should.have.callCount(0);
      clock.tick(18000);
      conn._rawConn.send.should.have.callCount(2);
      clock.tick(18000);
      conn._rawConn.close.should.have.callCount(1);
    });
    it('should emit error on connection error', function () {
      const cb = sinon.spy();
      conn.once('error', cb);
      conn._rawConn.onerror();
      cb.should.have.callCount(1);
    });
  });

  describe('Messages processing', function () {
    it('should process messages one by one', function () {
      const cb1 = sinon.spy(() => new Promise(res => setTimeout(res, 20)));
      const cb2 = sinon.spy(() => new Promise(res => setTimeout(res, 30)));
      conn.once('message:added', cb1);
      conn.once('message:removed', cb2);
      conn._rawConn.onmessage({data: EJSON.stringify({msg: 'added'})});
      conn._rawConn.onmessage({data: EJSON.stringify({msg: 'removed'})});
      cb1.should.have.callCount(0);
      cb2.should.have.callCount(0);
      return Promise.resolve().then(() => {
        cb1.should.have.callCount(1);
        cb2.should.have.callCount(0);
        clock.tick(25);
        return cb1.getCall(0).returnValue.then();
      }).then(() => Promise.resolve().then(() => {
        cb1.should.have.callCount(1);
        cb2.should.have.callCount(1);
        cb2.getCall(0).returnValue;
      }));
    });
    it('should process only DDP message types', function () {
      conn._processMessage({msg: 'ping'});
      conn._processMessage({msg: 'pong'});
      conn._processMessage({msg: 'result'});
      conn._processMessage({msg: 'updated'});
      conn._processMessage({msg: 'error'});
      conn._processMessage({msg: 'nosub'});
      conn._processMessage({msg: 'added'});
      conn._processMessage({msg: 'removed'});
      conn._processMessage({msg: 'changed'});
      conn._processMessage({msg: 'connected'});
      (() => conn._processMessage({msg: 'unknown'})).should.throw(Error);

      const cb = sinon.spy();
      conn.once('error', cb);
      cb.should.have.callCount(0);
      return conn._handleRawMessage(EJSON.stringify({msg: 'unknown'}))
        .then(() => {
          cb.should.have.callCount(1);
        });
    });
    it('should emit errir if error rised while sending message', function () {
      const cb = sinon.spy();
      conn.once('error', cb);
      cb.should.have.callCount(0);
      conn._rawConn.send = sinon.stub().throws();
      conn._sendMessage({a: 1});
      cb.should.have.callCount(1);
    });
  });
});
