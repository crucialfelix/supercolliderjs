
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

  describe('nextNodeID', function() {
    it('should increment', function() {
      var s = new Server();
      var na = s.nextNodeID();
      var nb = s.nextNodeID();
      expect(nb).toEqual(na + 1);
    });
  });

  describe('allocAudioBus', function() {
    it('should alloc a bus', function() {
      var s = new Server();
      var b = s.allocAudioBus(2);
      // 2 in 2 out, first bus is 4
      expect(b).toEqual(4);
    });
  });

  describe('allocControlBus', function() {
    it('should alloc a bus', function() {
      var s = new Server();
      var b = s.allocControlBus(1);
      expect(b).toEqual(0);
    });
  });

  describe('allocBuffer', function() {
    it('should alloc a buffer', function() {
      var s = new Server();
      var b = s.allocBuffer(2);
      expect(b).toEqual(0);
    });
  });

  describe('freeAudioBus', function() {
    it('should free a bus', function() {
      var s = new Server();
      var b = s.allocAudioBus(2);
      s.freeAudioBus(b, 2);
    });
  });

  describe('allocControlBus', function() {
    it('should free a bus', function() {
      var s = new Server();
      var b = s.allocControlBus(1);
      s.freeAudioBus(b, 1);
    });
  });

  describe('freeBuffer', function() {
    it('should free a buffer', function() {
      var s = new Server();
      var b = s.allocBufferID(1);
      s.freeBuffer(b, 1);
    });
  });

});
