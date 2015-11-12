
jest.dontMock('../factory');

var f = require('../factory');
var ext = require('../internals/side-effects');

/**
 * supply return values for mocked functions
 */
function mockExternals() {
  var values = {
    server: {host: 'example.com'},
    lang: {options: {}},
    msg: ['/hi', 'how', 2],
    nodeID: 1
  };

  ext.bootServer.mockReturnValue({
    then: function(callback) {
      callback(values.server);
    }
  });

  ext.bootLang.mockReturnValue({
    then: function(callback) {
      callback(values.lang);
    }
  });

  ext.sendMsg.mockReturnValue({
    then: function(callback) {
      console.log('called sendMsg');
      callback(values.msg);
    }
  });

  ext.nextNodeID.mockReturnValue({
    then: function(callback) {
      callback(values.nodeID);
    }
  });

  return values;
}


describe('resolveValues', function() {
  pit('should pass non-promises through', function() {
    return f.resolveValues({id: 1, fn: function() { return 2; }})
      .then((result) => {
        expect(result.id).toBe(1);
        expect(result.fn).toBe(2);
      });
  });

  pit('should resolve promises returned from functions', function() {
    var input = {
      fn: function() {
        return Promise.resolve(1);
      }
    };

    return f.resolveValues(input)
      .then((result) => {
        expect(result.fn).toBe(1);
      });
  });
});


describe('withContext', function() {
  pit('should resolve immediately with no deps required', function() {
    return f.withContext().then((context) => {
      expect(context.id).toBe(1);
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

      // expect sendMsg to have been called
    });
  });
});
