import scserver from "../scserver";

/**
 * mock context.scserver.send.bundle
 *  context.scserver.callAndResponse
 */
describe("scserver", function() {
  // TODO use real objects
  const context = {
    scserver: {
      callAndResponse: jest.fn(),
      send: {
        bundle: jest.fn(),
      },
    },
  };
  const properties = {};

  describe("msg", function() {
    it("should send msg", function() {
      const cmd = {
        scserver: {
          msg: ["/s_new", "sin", 1000, 0, 1],
        },
      };

      scserver(cmd, context, properties, context => {
        return context;
      });
      expect(context.scserver.send.bundle).toHaveBeenCalled();
    });
  });
});
