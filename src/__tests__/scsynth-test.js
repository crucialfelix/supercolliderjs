
jest.autoMockOff();

var Server = require('../scsynth').Server;

describe('scsynth', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var synth = new Server();
      expect(synth).toBeDefined();
    });
  });

  describe('resetState', function() {
    it('should make a new state', function() {
      var s = new Server();
      var state = s.state;
      s.resetState();
      expect(s.state !== state).toBe(true);
    });
  });
});
