
jest.dontMock('../dryadic');
var f = require('../dryadic');
var ext = require('../internals/side-effects');

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

    var values = {
      server: {
        options: {
          host: '127.0.0.1',
          port: '57110'
        },
        mutateState: jest.genMockFunction()
      }
    };

    ext.bootServer.mockReturnValue(Promise.resolve(values.server));

    return f.withContext({}, true).then((context) => {
      expect(context.server).toBe(values.server);
    });
  });
});

describe('makeChildContext', function() {
  it('should append keyName to the id', function() {
    var child = f.makeChildContext({id: '0'}, '1');
    expect(child.id).toBe('0.1');
  });

  it('should copy parentContext in', function() {
    var child = f.makeChildContext({id: '0', key: 'value'}, '1');
    expect(child.key).toBe('value');
  });
});
