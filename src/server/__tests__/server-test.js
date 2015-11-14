

jest.dontMock('../server');
jest.dontMock('../internals/allocators');
jest.dontMock('rx');
var Server = require('../server').Server;

describe('Server', function() {

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

  describe('allocBufferID', function() {
    it('should alloc a buffer', function() {
      var s = new Server();
      var b = s.allocBufferID(2);
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

  describe('oscOnce', function() {
    pit('should fullfill', function() {
      var s = new Server();

      var p = s.oscOnce(['/done', '/notify']).then((rest) => {
        // p is now fulfilled
        // console.log(rest);
        expect(_.isEqual(rest, [15])).toBe(true);
      });
      // console.log('sender', s.send.msg);
      expect(s.send.msg.mock.calls.length).toBe(0);

      // this will trigger it
      s.receive.onNext({
        'address': '/done',
        'args': [
          {
            'type': 'string',
            'value': '/notify'
          },
          {
            'type': 'integer',
            'value': 15
          }
        ],
        'oscType': 'message'
      });
      return p;
    });


    it('should reject if server is not booted', function() {
      // this would be send that rejects it
      // do this later when you implement that
    });
    it('should reject if send fails', function() {
      // s.send.msg.mockReturnValueOnce
    });
    // server could respond with command not recognized
  });

  describe('callAndResponse', function() {
    pit('should call and get response', function() {
      var s = new Server();

      var car = {
        call: ['/notify'],
        response: ['/done', '/notify']
      };

      var p = s.callAndResponse(car).then((response) => {
        expect(_.isEqual(response, [15])).toBe(true);
      });
      // console.log('sender', s.send);
      expect(s.send.msg.mock.calls.length).toBe(1);

      // server responds
      s.receive.onNext({
        'address': '/done',
        'args': [
          {
            'type': 'string',
            'value': '/notify'
          },
          {
            'type': 'integer',
            'value': 15  // clientID
          }
        ],
        'oscType': 'message'
      });

      return p;
    });
  });

});
