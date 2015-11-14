/*jshint sub:true*/

jest.dontMock('Rx');
jest.dontMock('../node-watcher');
jest.dontMock('../server');
var nw = require('../node-watcher');
var Server = require('../server').Server;
import * as _ from 'underscore';


describe('node-watcher', function() {

  var nodeID = 1000;
  var id = '0.1.2';
  var id2 = '0.1.3';

  function expectEqualState(s, object) {
    var cs = s.state.get('NODE_WATCHER').toJS();
    var is = _.isEqual(cs, object);
    if (!is) {
      // as long as callbacks have the same keys list
      // the functions were copied and aren't the same ones now
      // which is annoying in itself
      if (!_.isEqual(cs['ON_NODE_GO'], object['ON_NODE_GO'])) {
        expect(cs).toEqual(object);
      }
      if (!_.isEqual(
          _.keys(cs['CALLBACKS']),
          _.keys(object['CALLBACKS']))) {
        expect(cs).toEqual(object);
      }
    }
  }

  describe('onNodeGo', function() {

    it('should register a callback', function() {
      function fn() {}
      var s = new Server();
      nw.onNodeGo(s, id, nodeID, fn);

      expectEqualState(s, {
        ON_NODE_GO: {
          '1000': [
            '0.1.2:1000'
          ]
        },
        CALLBACKS: {
          '0.1.2:1000': fn
        }
      });
    });

    it('should add another callback on same node', function() {
      function fn() {}
      var s = new Server();
      nw.onNodeGo(s, id, nodeID, fn);
      nw.onNodeGo(s, id2, nodeID, fn);

      expectEqualState(s, {
        ON_NODE_GO: {
          '1000': [
            '0.1.2:1000',
            '0.1.3:1000'
          ]
        },
        CALLBACKS: {
          '0.1.2:1000': fn,
          '0.1.3:1000': fn
        }
      });
    });

    it('should dispose of callback', function() {
      function fn() {}
      var s = new Server();
      var dispose = nw.onNodeGo(s, id, nodeID, fn);
      expect(dispose).toBeTruthy();
      dispose();

      expectEqualState(s, {
        ON_NODE_GO: {
          '1000': []
        },
        CALLBACKS: {}
      });
    });
  });

  describe('watchNodeNotifications', function() {
    pit('should fire a onNodeGo handler when server receives', function() {
      var s = new Server();

      return new Promise((resolve, reject) => {

        nw.onNodeGo(s, id, nodeID, (nid) => {
          expect(nid).toBe(nodeID);
          resolve();
        });

        s.receive.onNext(['/n_go', nodeID, 0, -1, 3, 0]);
      });
    });

  });

});
