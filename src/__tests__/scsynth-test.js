
jest.autoMockOff();

var SCSynth = require('../scsynth');

describe('scsynth', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var synth = new SCSynth({});
      expect(synth).toBeDefined();
    });
  });

});
