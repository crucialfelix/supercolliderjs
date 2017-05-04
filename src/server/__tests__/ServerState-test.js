import Server from '../server';
import ServerState from '../ServerState';

describe('ServerState', function() {
  var state;
  beforeEach(function() {
    var server = new Server();
    state = new ServerState(server);
  });

  describe('default constructor', function() {
    it('should exist', function() {
      expect(state).toBeDefined();
      // console.log('initial state', state.store.state.toJS());
    });
  });

  describe('keys', function() {
    it('should build a valid key list', function() {
      var keys = state._keys(['test']);
      expect(keys.length).toEqual(3);
    });
  });

  describe('resetState', function() {
    it('should make a new state', function() {
      var old = state.store.state;
      state.resetState();
      var newState = state.store.state;
      // console.log(state.store.state);
      expect(old !== newState).toBe(true);
    });
  });

  describe('nextNodeID', function() {
    it('should increment', function() {
      var na = state.nextNodeID();
      var nb = state.nextNodeID();
      expect(nb).toEqual(na + 1);
    });
  });

  describe('allocAudioBus', function() {
    it('should alloc a bus', function() {
      var b = state.allocAudioBus(2);
      // 2 in 2 out, first bus is 4
      expect(b).toEqual(4);
    });
  });

  describe('allocControlBus', function() {
    it('should alloc a bus', function() {
      var b = state.allocControlBus(1);
      expect(b).toEqual(0);
    });
  });

  describe('allocBufferID', function() {
    it('should alloc a buffer', function() {
      var b = state.allocBufferID(2);
      expect(b).toEqual(0);
    });
  });

  describe('freeAudioBus', function() {
    it('should free a bus', function() {
      var b = state.allocAudioBus(2);
      state.freeAudioBus(b, 2);
    });
  });

  describe('allocControlBus', function() {
    it('should free a bus', function() {
      var b = state.allocControlBus(1);
      state.freeAudioBus(b, 1);
    });
  });

  describe('freeBuffer', function() {
    it('should free a buffer', function() {
      var b = state.allocBufferID(1);
      state.freeBuffer(b, 1);
    });
  });
});
