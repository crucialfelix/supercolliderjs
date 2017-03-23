import scserver from '../scserver';

/**
 * mock context.scserver.send.bundle
 *  context.scserver.callAndResponse
 */
describe('scserver', function() {
  let context = {
    scserver: {
      callAndResponse: jest.fn(),
      send: {
        bundle: jest.fn()
      }
    }
  };
  let properties = {};

  describe('msg', function() {
    it('should send msg', function() {
      let cmd = {
        scserver: {
          msg: ['/s_new', 'sin', 1000, 0, 1]
        }
      };

      scserver(cmd, context, properties);
      expect(context.scserver.send.bundle).toHaveBeenCalled();
    });
  });
});
