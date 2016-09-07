

jest.autoMockOff();
jest.dontMock('../resolveOptions');
var resolveOptions = require('../resolveOptions').default;
var _ = require('underscore');

describe('resolveOptions', function() {

  // `pit` is `it` for promises
  pit('should get default options with no undefines', function() {
    return resolveOptions().then(function(opts) {
      _.each(opts, function(val) {
        expect(val).toBeDefined();
      });
    });
  });

  pit('should reject if configPath does not exist', function() {
    var badPath = '/bad/path.yaml';
    return resolveOptions(badPath, {}).then(() => {
      this.fail('should not have resolved');
    }, function(err) {
      expect(err.message).toBeTruthy();
      expect(err.data.configPath).toEqual(badPath);
    });
  });

  pit('should remove undefined values from supplied options', function() {
    return resolveOptions(null, {sclang: undefined}).then(function(opts) {
      _.each(opts, function(val) {
        expect(val).toBeDefined();
      });
    });
  });

});
