
jest.dontMock('../factory');

var f = require('../factory');
var ext = require('../internals/side-effects');
var nodeWatcher = require('../node-watcher');

/**
 * supply return values for mocked functions
 */
function mockExternals() {
  var values = {
    server: {
      options: {
        host: '127.0.0.1',
        port: '57110'
      }
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

  // ext.bootServer.mockReturnValue({
  //   then: function(callback) {
  //     callback(values.server);
  //   }
  // });

  ext.bootLang.mockReturnValue(Promise.resolve(values.lang));

  ext.sendMsg.mockReturnValue({
    then: function(callback) {
      callback(values.msg);
    }
  });

  ext.nextNodeID.mockReturnValue(values.nodeID);

  nodeWatcher.nodeGo.mockReturnValue(Promise.resolve(values.nodeID));

  return values;
}

function fail(error) {
  console.error(error);
  // trying to force the test to be a failure
  expect(error).toBe(null);
  // throw new Error(error);
}

describe('callAndResolveValues', function() {
  pit('should pass non-promises through', function() {
    var pc = {parent: 'context'};
    return f.callAndResolveValues({id: 1, fn: function() { return 2; }}, pc)
      .then((result) => {
        expect(result.id).toBe(1);
        expect(result.fn).toBe(2);
      });
  });

  pit('should resolve promises returned from functions', function() {
    var pc = {parent: 'context'};
    var input = {
      fn: function(context) {
        // should get a parent context passed in
        expect(context).toBeTruthy();
        return Promise.resolve(1);
      }
    };

    return f.callAndResolveValues(input, pc)
      .then((result) => {
        expect(result.fn).toBe(1);
      });
  });
});


describe('withContext', function() {
  pit('should resolve immediately with no deps required', function() {
    return f.withContext().then((context) => {
      expect(context.id).toBe('0');
    });
  });

  pit('should contain values from parent context', function() {
    return f.withContext({parentVal: true}).then((context) => {
      expect(context.parentVal).toBe(true);
    });
  });

  pit('should boot the server if requested', function() {

    var values = mockExternals();

    return f.withContext({}, true).then((context) => {
      expect(context.server).toBe(values.server);
    });
  });
});

describe('synth', function() {
  pit('should resolve with a nodeID', function() {

    var values = mockExternals();

    var synth = f.synth('def', {freq: 400});
    return synth().then((nodeID) => {
      expect(nodeID).toBe(values.nodeID);
    });
  });
});



      // expect sendMsg to have been called
    });
  });
});
