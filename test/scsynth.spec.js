
var supercolliderjs = require('../index');
var SCSynth = supercolliderjs.scsynth;
var should = require('should');

describe('scsynth', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var synth = new SCSynth({});
      should.exist(synth);
    });
  });

});
