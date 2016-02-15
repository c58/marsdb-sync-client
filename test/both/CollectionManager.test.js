import { createCollectionDelegate } from '../../lib/CollectionManager';
import { _resetStartup } from 'marsdb/dist/Collection';
import Collection from 'marsdb';
import chai, { expect } from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();


const _defaultDelegate = Collection.defaultDelegate();
describe('CollectionManager', function () {
  let conn, db, manager;
  beforeEach(function () {
    _resetStartup();
    conn = {
      on: sinon.spy(),
      sendResult: sinon.spy(),
      sendUpdated: sinon.spy(),
      methodManager: { apply: sinon.spy(() => ({
        result: () => Promise.resolve([2]),
        then: () => Promise.resolve([2]),
      }))},
    };
    const managerClass = createCollectionDelegate(conn);
    Collection.defaultDelegate(managerClass);
    db = new Collection('test');
    db._lazyInitCollection();
    manager = db.delegate;
  });

  afterEach(function () {
    _resetStartup();
    Collection.defaultDelegate(_defaultDelegate);
  });


  describe('#constructor', function () {
    it('should add listeners to connection', function () {
      conn.on.should.have.callCount(4);
    });
  });


  describe('#update', function () {
    it('should accept no options', function () {
      return db.insert({a: 1, _id: '123'}, {quiet: true}).then(() => {
        return manager.update('123', {$set: {a: 2}}).then(() => {
          conn.methodManager.apply.should.have.callCount(1);
          return db.findOne('123')
        }).then((doc) => {
          doc.should.be.deep.equals({a: 2, _id: '123'});
        });
      });
    });

    it('should call super remove if quiet', function () {
      return db.insert({a: 1, _id: '123'}, {quiet: true}).then(() => {
        return manager.update('123', {$set: {a: 2}}, {quiet: true}).then(() => {
          conn.methodManager.apply.should.have.callCount(0);
          return db.findOne('123')
        }).then((doc) => {
          doc.should.be.deep.equals({a: 2, _id: '123'});
        });
      });
    });

    it('should revert update on update fail', function () {
      conn.methodManager = {
        apply: sinon.spy(() => Promise.reject()),
      };
      return db.insertAll([{_id: 1, a: 1}, {_id: 2, a: 2}], {quiet: true}).then(() => {
        db.update = sinon.spy();
        return manager.update({}, {$set: {a: 3}}, {multi: true});
      }).then(() => {
        return Promise.resolve().then(() => {
          db.update.should.have.callCount(2);
          db.update.getCall(0).args[0].should.be.deep.equal({_id: 1});
          db.update.getCall(0).args[1].should.be.deep.equal({a: 1});
          db.update.getCall(0).args[2].should.be.deep.equal({quiet: true, upsert: true});
          conn.methodManager.apply.should.have.callCount(1);
          conn.methodManager.apply.getCall(0).args[0].should.be.equals('/test/update');
          conn.methodManager.apply.getCall(0).args[1].should.be.deep.equals([{}, {$set: {a: 3}}, {multi: true}]);
        })
      });
    });

    it('should revert upsert update', function () {
      conn.methodManager = {
        apply: sinon.spy(() => Promise.reject()),
      };
      return db.insertAll([{_id: 1, a: 1}, {_id: 2, a: 2}], {quiet: true}).then(() => {
        db.remove = sinon.spy();
        return manager.update({_id: 3}, {$set: {a: 3}}, {multi: true, upsert: true});
      }).then(() => {
        return Promise.resolve().then(() => {
          db.remove.should.have.callCount(1);
          db.remove.getCall(0).args[1].should.be.deep.equal({quiet: true});
          conn.methodManager.apply.should.have.callCount(1);
          conn.methodManager.apply.getCall(0).args[0].should.be.equals('/test/update');
          conn.methodManager.apply.getCall(0).args[1].should.be.deep.equals(
            [{_id: 3}, {$set: {a: 3}}, {multi: true, upsert: true}]);
        })
      });
    });

    it('should wait until server result when waitResult options passed', function () {
      return db.insert({a: 1, _id: '123'}, {quiet: true}).then(() => {
        const cb = sinon.spy();
        conn.methodManager = { apply: sinon.spy(() => ({
          then: () => {
            return Promise.all([
              Promise.resolve({
                modified: 1,
                updated: [{a: 3, _id: '123'}],
                original: [{a: 1, _id: '123'}],
              }),
              db.update('123', {$set: {a: 3}}, {quiet: true})
            ])
          },
        }))}
        return manager.update('123', {$set: {a: 2}}, {waitResult: true})
          .then(() => db.findOne('123'))
          .then((res) => {
            res.should.be.deep.equal({a: 3, _id: '123'});
          });
      });
    });
  });


  describe('#remove', function () {
    it('should accept no options', function () {
      return db.insert({a: 1, _id: '123'}, {quiet: true}).then(() => {
        return manager.remove('123').then(() => {
          conn.methodManager.apply.should.have.callCount(1);
          return db.findOne('123')
        }).then((doc) => {
          expect(doc).to.be.undefined;
        });
      });
    });

    it('should call super remove if quiet', function () {
      return db.insert({a: 1, _id: '123'}, {quiet: true}).then(() => {
        return manager.remove('123', {quiet: true}).then(() => {
          conn.methodManager.apply.should.have.callCount(0);
          return db.findOne('123')
        }).then((doc) => {
          expect(doc).to.be.undefined;
        });
      });
    });

    it('should revert remove on insert fail', function () {
      conn.methodManager = {
        apply: sinon.spy(() => Promise.reject()),
      };
      return db.insertAll([{_id: 1, a: 1}, {_id: 2, a: 2}], {quiet: true}).then(() => {
        db.insertAll = sinon.spy();
        return manager.remove({}, {multi: true});
      }).then(() => {
        return Promise.resolve().then(() => {
          db.insertAll.should.have.callCount(1);
          db.insertAll.getCall(0).args[0].should.be.deep.equal([{_id: 1, a: 1}, {_id: 2, a: 2}]);
          db.insertAll.getCall(0).args[1].should.be.deep.equal({quiet: true});
          conn.methodManager.apply.should.have.callCount(1);
          conn.methodManager.apply.getCall(0).args[0].should.be.equals('/test/remove');
          conn.methodManager.apply.getCall(0).args[1].should.be.deep.equals([{}, {multi: true}]);
        })
      });
    });

    it('should wait until server result when waitResult options passed', function () {
      return db.insertAll([
        {a: 1, _id: '123'},
        {a: 2, _id: '321'}
      ], {quiet: true}).then(() => {
        const cb = sinon.spy();
        conn.methodManager = { apply: sinon.spy(() => ({
          then: () => {
            return Promise.all([
              Promise.resolve([{a: 1, _id: '123'}, {a: 2, _id: '321'}]),
              db.remove({}, {quiet: true, multi: true})
            ])
          },
        }))}
        return manager.remove('123', {waitResult: true})
          .then(() => db.find())
          .then((res) => {
            res.should.have.length(0);
          });
      });
    });
  });


  describe('#insert', function () {
    it('should accept no options or random seed', function () {
      return manager.insert({a: 1, _id: '123'}).then(() => {
        conn.methodManager.apply.should.have.callCount(1);
        return db.findOne('123')
      }).then((doc) => {
        doc.should.be.deep.equal({a: 1, _id: '123'});
      });
    });

    it('should call super insert if quiet', function () {
      return manager.insert({a: 1, _id: '123'}, {quiet: true}).then((docId) => {
        conn.methodManager.apply.should.have.callCount(0);
        docId.should.be.equal('123');
        return db.findOne('123')
      }).then((doc) => {
        doc.should.be.deep.equal({a: 1, _id: '123'});
      });
    });

    it('should call insert method', function () {
      db.remove = sinon.spy();
      return manager.insert({_id: 1, a: 1}, {}, {seed: 1}).then(() => {
        db.remove.should.have.callCount(0);
        conn.methodManager.apply.should.have.callCount(1);
      });
    });

    it('should revert insert on insert fail', function () {
      db.remove = sinon.spy();
      conn.methodManager = {
        apply: sinon.spy(() => Promise.reject()),
      };
      return manager.insert({_id: 1, a: 1}, {}, {seed: 1}).then(() => {
        return Promise.resolve().then(() => {
          db.remove.should.have.callCount(1);
          db.remove.getCall(0).args[1].should.be.deep.equal({quiet: true});
          conn.methodManager.apply.should.have.callCount(1);
          conn.methodManager.apply.getCall(0).args[0].should.be.equals('/test/insert');
          conn.methodManager.apply.getCall(0).args[1].should.be.deep.equals([{_id: 1, a: 1}, {}]);
          conn.methodManager.apply.getCall(0).args[2].should.be.deep.equals(1);
        })
      });
    });

    it('should wait until server result when waitResult options passed', function () {
      const cb = sinon.spy();
      conn.methodManager = { apply: sinon.spy(() => ({
        then: () => {
          return Promise.all([
            Promise.resolve('2'),
            db.insert({_id: '2', a: 1}, {quiet: true})
          ])
        },
      }))}
      return manager.insert({_id: '1', a: 2}, {waitResult: true})
        .then(() => db.find())
        .then((res) => {
          res.should.have.length(1);
          res[0].should.be.deep.equal({_id: '2', a: 1});
        });
    });
  });

  describe('#_handleRemoteAdded', function () {
    it('should insert new document', function () {
      return manager._handleRemoteAdded({id: 1, fields: {a: 1}}).then(() => {
        return db.findOne(1);
      }).then((doc) => {
        doc.should.be.deep.equals({_id: 1, a: 1});
      });
    });

    it('should replace document if it exists', function () {
      return db.insert({_id: 1, a: 1}).then(() => {
        return manager._handleRemoteAdded({id: 1, fields: {a: 2}});
      }).then(() => {
        return db.findOne(1);
      }).then((doc) => {
        doc.should.be.deep.equals({_id: 1, a: 2});
      });
    });

    it('should ignore id in fields', function () {
      return db.insert({_id: 1, a: 1}).then(() => {
        return manager._handleRemoteAdded({id: 1, fields: {_id: 123, a: 2}});
      }).then(() => {
        return Promise.all([db.findOne(1), db.findOne(123)]);
      }).then((docs) => {
        docs.should.have.length(2);
        docs[0].should.be.deep.equals({_id: 1, a: 2});
        expect(docs[1]).to.be.undefined;
      });
    });
  });

  describe('#_handleRemoteChanged', function () {
    it('should set only new fields', function () {
      return db.insert({_id: 1, a: 1, b: 2}).then(() => {
        return manager._handleRemoteChanged({id: 1, fields: {b: 3}})
      }).then(() => {
        return db.findOne(1);
      }).then((doc) => {
        doc.should.be.deep.equals({_id: 1, a: 1, b: 3});
      });
    });

    it('should clear fields', function () {
      return db.insert({_id: 1, a: 1, b: 2}).then(() => {
        return manager._handleRemoteChanged({id: 1, cleared: ['b', 'c']})
      }).then(() => {
        return db.findOne(1);
      }).then((doc) => {
        doc.should.be.deep.equals({_id: 1, a: 1});
      });
    });

    it('should ignore id in fields', function () {
      return db.insert({_id: 1, a: 1, b: 2}).then(() => {
        return manager._handleRemoteChanged({id: 1, fields: {b: 3, _id: 3}})
      }).then(() => {
        return Promise.all([db.findOne(1), db.findOne(3)]);
      }).then((docs) => {
        docs.should.have.length(2);
        docs[0].should.be.deep.equals({_id: 1, a: 1, b: 3});
        expect(docs[1]).to.be.undefined;
      });
    });

    it('should do nothing if fields and clear not presented', function () {
      return db.insert({_id: 1, a: 1, b: 2}).then(() => {
        return manager._handleRemoteChanged({id: 1})
      }).then(() => {
        return db.findOne(1);
      }).then((doc) => {
        doc.should.be.deep.equals({_id: 1, a: 1, b: 2});
      });
    });

    it('should do nothing if object with given id not exists', function () {
      return db.insert({_id: 1, a: 1, b: 2}).then(() => {
        return manager._handleRemoteChanged({id: 2, fields: {b: 2}, cleared: ['b', 'c']})
      }).then(() => {
        return Promise.all([db.findOne(1), db.findOne(2)]);
      }).then((docs) => {
        docs.should.have.length(2);
        docs[0].should.be.deep.equals({_id: 1, a: 1, b: 2});
        expect(docs[1]).to.be.undefined;
      });
    });
  });

  describe('#_handleRemoteRemoved', function () {
    it('should remove a document', function () {
      return db.insert({_id: 1, a: 1, b: 2}).then(() => {
        return manager._handleRemoteRemoved({id: 1})
      }).then(() => {
        return db.findOne(1);
      }).then((doc) => {
        expect(doc).to.be.undefined;
      });
    });
  });

  describe('#_handleConnected', function () {
    it('should sync client side documents with server-side', function () {
      return db.insertAll([{_id: 1, a: 1},{_id: 2, a: 1}], {quiet: true}).then(() => {
        return manager._handleConnected();
      }).then(() => {
        return db.find();
      }).then((docs) => {
        conn.methodManager.apply.should.have.callCount(1);
        conn.methodManager.apply.getCall(0).args.should.be.deep.equals(['/test/sync', [[1,2]]]);
        docs.should.have.length(1);
        docs[0].should.be.deep.equals({_id: 1, a: 1});
      });
    });
  });
});
