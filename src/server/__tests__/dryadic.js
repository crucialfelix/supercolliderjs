
jest.dontMock('../dryadic');
var f = require('../dryadic');
var ext = require('../internals/side-effects');
import {Promise} from 'bluebird';

describe('callAndResolve', function() {
  pit('should pass a non-promise through', function() {
    var pc = {parent: 'context'};
    return f.callAndResolve(1, pc)
      .then((result) => {
        expect(result).toBe(1);
      });
  });

  pit('should resolve promises returned from functions', function() {
    var value = 1;
    var pc = {parent: 'context'};
    var input = (context) => {
      // should get a parent context passed in
      expect(context).toBeTruthy();
      return Promise.resolve(value);
    };

    return f.callAndResolve(input, pc)
      .then((result) => {
        expect(result).toBe(value);
      });
  });
});


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


describe('callAndResolveAll', function() {
  var pc = {parent: 'context'};
  var values = [
    1,
    () => 2
  ];

  pit('should pass non-promises through', function() {
    return f.callAndResolveAll(values, pc)
      .then((result) => {
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(2);
      });
  });

  pit('should resolve promises returned from functions', function() {

    var input = [
      (context) => {
        // should get a parent context passed in
        expect(context).toBeTruthy();
        return Promise.resolve(values[0]);
      }
    ];

    return f.callAndResolveAll(input, pc)
      .then((result) => {
        expect(result[0]).toBe(values[0]);
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
