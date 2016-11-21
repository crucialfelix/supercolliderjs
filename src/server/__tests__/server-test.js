
import _ from 'lodash';
import { EventEmitter } from 'events';
import Server from '../server';

describe('Server', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var server = new Server();
      expect(server).toBeDefined();
    });
  });

  describe('boot sequence', function() {
    pit('should detect "server ready" even if the output is broken into chunks', function() {

      var one = 'SuperCollider 3 se';
      var two = 'rver ready.';

      var server = new Server();
      spyOn(server, '_spawnProcess').and.returnValue();
      // make a fake this.process.stdout / stderr
      server.process = {
        stdout: new EventEmitter(),
        stderr: new EventEmitter()
      };

      return new Promise((resolve) => {
        // spawn process is mocked
        // should get triggered by the stdout and then resolve
        server.boot().then(resolve);

        server.process.stdout.emit('data', one);
        server.process.stdout.emit('data', two);
      });
    });
  });

  describe('oscOnce', function() {
    pit('should fullfill', function() {
      var s = new Server();

      s.send.msg = jest.genMockFunction();

      var p = s.oscOnce(['/done', '/notify']).then((rest) => {
        // p is now fulfilled
        // console.log(rest);
        expect(_.isEqual(rest, [15])).toBe(true);
      });
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

      s.send.msg = jest.genMockFunction();

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
