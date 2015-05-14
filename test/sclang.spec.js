
var supercolliderjs = require('../index');
var SCLang = supercolliderjs.sclang;
var should = require('should');
var _ = require('underscore');
var path = require('path');

describe('sclang', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var sclang = new SCLang({});
      should.exist(sclang);
    });
  });

  describe('sclangConfigOptions', function() {

    it('should include sc-classes if errorsAsJSON is true', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({errorsAsJSON: true});
      opts.includePaths.length.should.be.exactly(1);
      var isIn = _.some(opts.includePaths, function(p) {
        return p.match(/sc\-classes/);
      });
      isIn.should.be.true;
    });

    it('should read a supplied sclang_conf', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({
        sclang_conf: path.join(__dirname, 'sclang_test_conf.yaml')
      });
      opts.includePaths.length.should.be.exactly(2);
      opts.excludePaths.length.should.be.exactly(1);
    });

    it('should merge sclang_conf with supplied includePaths', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({
        sclang_conf: path.join(__dirname, 'sclang_test_conf.yaml'),
        includePaths: [
          '/custom/one',
          '/path/include/one'
        ],
        excludePaths: [
          '/custom/two'
        ],
      });
      opts.includePaths.length.should.be.exactly(3);
      opts.excludePaths.length.should.be.exactly(2);
    });

  });

});
