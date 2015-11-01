
jest.autoMockOff();

var sc = require('../../index');

var SCSynth = sc.server.Server;

describe('scsynth', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var synth = new SCSynth({});
      expect(synth).toBeDefined();
    });
  });

});
