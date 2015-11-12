
jest.dontMock('../msg');
var msg = require('../msg');
var _ = require('underscore');

describe('msg', function() {
  it('should evaluate each one without error', function() {
    _.each(msg, function(value, key) {
      if (_.isFunction(value)) {
        var result = value();
        expect(_.isArray(result)).toBeTruthy();
      }
    });
  });
});
