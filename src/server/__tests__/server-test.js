

jest.dontMock('../server');
jest.dontMock('rx');
import * as _ from 'underscore';

var Server = require('../server').Server;

describe('Server', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var server = new Server();
      expect(server).toBeDefined();
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

      // server responds
      s.receive.onNext(['/done', '/notify', 15]);
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
      s.receive.onNext(['/done', '/notify', 15]);

      return p;
    });
  });
});
