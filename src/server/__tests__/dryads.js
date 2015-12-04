
jest.dontMock('../dryads');
jest.dontMock('../../dryadic/helpers');

var f = require('../dryads');
var ext = require('../internals/side-effects');
var nodeWatcher = require('../node-watcher');
import {Promise} from 'bluebird';
import {Subject} from 'rx';


// move this into a describe
describe('dryads', function() {

  /**
   * supply return values for mocked functions
   */
  function mockExternals() {
    var values = {
      server: {
        options: {
          host: '127.0.0.1',
          port: '57110'
        },
        state: {
          mutate: jest.genMockFunction()
        },
        callAndResponse: jest.genMockFunction()
          .mockReturnValue(Promise.resolve())
      },
      lang: {
        options: {
          host: '127.0.0.1',
          port: '57120'
        }
      },
      msg: ['/hi', 'how', 2],
      nodeID: 1,
      defName: 'defName'
    };

    ext.bootServer.mockReturnValue(Promise.resolve(values.server));
    ext.bootLang.mockReturnValue(Promise.resolve(values.lang));
    ext.sendMsg.mockReturnValue(Promise.resolve(values.msg));
    ext.nextNodeID.mockReturnValue(values.nodeID);
    nodeWatcher.whenNodeGo.mockReturnValue(Promise.resolve(values.nodeID));

    return values;
  }

  describe('synth', function() {
    pit('should resolve with a nodeID', function() {

      var values = mockExternals();

      var synth = f.synth('def', {freq: 400});
      return synth().then((nodeID) => {
        expect(nodeID).toBe(values.nodeID);
      });
    });
    // expect sendMsg to have been called
    // expect args to have been spawned
  });

  describe('group', function() {

    var g = f.group([
      f.synth('saw', {freq: 440, sustain: 1.2}),
      f.synth('saw', {freq: 445, sustain: 1.2}),
    ]);

    pit('should spawn children', function() {
      // should be 3 send messages
      return g().then(() => {
        // for (var ins of ext.sendMsg.mock.calls) {
        //   console.log(ins);
        // }
        // 3, no ?
        expect(ext.sendMsg.mock.calls.length).toBe(4);
      });
    });
  });

  describe('compileSynthDef', function() {
    pit('should resolve with a defName', function() {

      var defName = 'defName';
      var def = {
        synthDesc: {meta: 'data'},
        bytes: [1, 2, 3]
      };

      ext.interpret.mockReturnValue(Promise.resolve(def));

      return f.compileSynthDef(defName, 'sc source code')().then((resolvedDefName) => {
        expect(resolvedDefName).toBe(defName);
      });
    });

    pit('should propagate a compile or runtime error in sc source code', function() {
      var defName = 'defName';

      ext.interpret.mockReturnValue(Promise.reject({error: 'some reason'}));

      return f.compileSynthDef(defName, 'sc source code')().then((resolvedDefName) => {
        expect(true).toBe(false); // should not have resolved
        expect(resolvedDefName).toBe(defName);
      }, () => {
        // this is to be expected
        // console.log(error, 'did error');
        return Promise.resolve(true);
      });
    });
  });
});


describe('synthStream', function() {
  it('should create', function() {
    var x = new Subject();
    var ss = f.synthStream(x);
    expect(ss).toBeTruthy();
  });
});
