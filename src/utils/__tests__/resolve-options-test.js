

jest.autoMockOff();

var resolveOptions = require('../resolveOptions');

describe('resolveOptions', function() {

  // `pit` is `it` for promises
  pit('should get default options with no undefines', () => {
    return resolveOptions().then(function(opts) {
      for (let key in opts) {
        expect(opts[key]).toBeDefined();
      }
    });
  });

  pit('should reject if configPath does not exist', function() {
    var badPath = '/bad/path.yaml';
    return resolveOptions(badPath, {}).then((opts) => {
      this.fail('should not have resolved');
    }, function(err) {
      expect(err.message).toBeTruthy();
      expect(err.configPath).toEqual(badPath);
    });
  });

  pit('should remove undefined values from supplied options', function() {
    return resolveOptions(null, {sclang: undefined}).then(function(opts) {
      for (let key in opts) {
        expect(opts[key]).toBeDefined();
      }
    });
  });

});
