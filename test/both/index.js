import * as MarsClient from '../../lib/index';
import { Collection, Random } from 'marsdb';
import { _resetStartup } from 'marsdb/dist/Collection';
import chai, {expect} from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();

let _defaultCursor = Collection.defaultCursor();
let _defaultDelegate = Collection.defaultDelegate();
describe('Exposed API', function () {
  beforeEach(() => {
    _resetStartup();
    MarsClient._removeConnection();
    Collection.defaultCursor(_defaultCursor);
    Collection.defaultDelegate(_defaultDelegate);
  });

  describe('#configure', function () {
    it('should rise an exception if no socket available', function () {
      (() => MarsClient.configure()).should.throw(Error);
    });

    it('should construct custom socket', function () {
      class CustomSocket {}
      const conn = MarsClient.configure({socket: CustomSocket});
      conn._socket.should.be.equal(CustomSocket);
      (() => MarsClient.call('asd')).should.throw(Error);
    });

    it('should use global websocket if available and not custom provided', function () {
      class CustomSocket {}
      global.WebSocket = CustomSocket;
      const conn = MarsClient.configure({socket: CustomSocket});
      conn._socket.should.be.equal(CustomSocket);
    });

    it('should start after startup', function (done) {
      class CustomSocket {}
      const conn = MarsClient.configure({socket: CustomSocket});
      (() => MarsClient.call('asd')).should.throw(Error);
      Collection.startup(() => {
        (() => MarsClient.call('asd')).should.not.throw(Error);
        done();
      })
    });
  });
});
