var msg = require('../msg');
import _ from 'lodash';

describe('msg', function() {
  it('should evaluate each one without error', function() {
    _.each(msg, function(value) {
      if (_.isFunction(value)) {
        var result = value();
        if (_.isArray(result)) {
          expect(_.isArray(result)).toBeTruthy();
        } else if (_.isObject(result)) {
          expect(result.call).toBeDefined();
          expect(result.response).toBeDefined();
        } else {
          fail('wrong type:' + result);
        }
      }
    });
  });
});
