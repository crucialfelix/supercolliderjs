
jest.autoMockOff();

var SCLang = require('../sclang');
var _ = require('underscore');
var path = require('path');

describe('sclang', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var sclang = new SCLang({});
      expect(sclang).toBeDefined();
    });
  });

  describe('sclangConfigOptions', function() {

    it('should include sc-classes if errorsAsJSON is true', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({errorsAsJSON: true});
      expect(opts.includePaths.length).toEqual(1);
      var isIn = _.some(opts.includePaths, function(p) {
        return p.match(/sc\-classes/);
      });
      expect(isIn).toBeDefined();
    });

    it('should read a supplied sclang_conf', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({
        sclang_conf: path.join(__dirname, '../../tests/sclang_test_conf.yaml')
      });
      expect(opts.includePaths.length).toEqual(2);
      expect(opts.excludePaths.length).toEqual(1);
    });

    it('should merge sclang_conf with supplied includePaths', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({
        sclang_conf: path.join(__dirname, '../../tests/sclang_test_conf.yaml'),
        includePaths: [
          '/custom/one',
          '/path/include/one'
        ],
        excludePaths: [
          '/custom/two'
        ],
      });
      expect(opts.includePaths.length).toEqual(3);
      expect(opts.excludePaths.length).toEqual(2);
    });

  });

  describe('args', function() {
    var sclang = new SCLang();
    var args = sclang.args({langPort: 4});
    expect(args.length).toEqual(2);
    expect(args[1]).toEqual(4);
  });

});
