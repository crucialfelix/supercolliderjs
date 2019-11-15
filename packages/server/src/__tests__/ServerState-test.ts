import Server from '../server';
import ServerState from '../ServerState';

describe('ServerState', function() {
  let state;
  beforeEach(function() {
    const server = new Server();
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
      const keys = state._keys(['test']);
      expect(keys.length).toEqual(3);
    });
  });

  describe('resetState', function() {
    it('should make a new state', function() {
      const old = state.store.state;
      state.resetState();
      const newState = state.store.state;
      // console.log(state.store.state);
      expect(old !== newState).toBe(true);
    });
  });

  describe('nextNodeID', function() {
    it('should increment', function() {
      const na = state.nextNodeID();
      const nb = state.nextNodeID();
      expect(nb).toEqual(na + 1);
    });
  });

  describe('allocAudioBus', function() {
    it('should alloc a bus', function() {
      const b = state.allocAudioBus(2);
      // 2 in 2 out, first bus is 4
      expect(b).toEqual(4);
    });
  });

  describe('allocControlBus', function() {
    it('should alloc a bus', function() {
      const b = state.allocControlBus(1);
      expect(b).toEqual(0);
    });
  });

  describe('allocBufferID', function() {
    it('should alloc a buffer', function() {
      const b = state.allocBufferID(2);
      expect(b).toEqual(0);
    });
  });

  describe('freeAudioBus', function() {
    it('should free a bus', function() {
      const b = state.allocAudioBus(2);
      state.freeAudioBus(b, 2);
    });
  });

  describe('allocControlBus', function() {
    it('should free a bus', function() {
      const b = state.allocControlBus(1);
      state.freeAudioBus(b, 1);
    });
  });

  describe('freeBuffer', function() {
    it('should free a buffer', function() {
      const b = state.allocBufferID(1);
      state.freeBuffer(b, 1);
    });
  });
});
