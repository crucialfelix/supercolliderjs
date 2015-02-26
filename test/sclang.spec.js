
var supercolliderjs = require('../index');
var SCLang = supercolliderjs.sclang;
var should = require('should');

describe('sclang', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var sclang = new SCLang({});
      should.exist(sclang);
    });
  });

});
