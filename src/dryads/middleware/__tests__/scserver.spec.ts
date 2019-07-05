import scserver from "../scserver";

/**
 * mock context.scserver.send.bundle
 *  context.scserver.callAndResponse
 */
describe("scserver", function() {
  // TODO use real objects
  let context = {
    scserver: {
      callAndResponse: jest.fn(),
      send: {
        bundle: jest.fn(),
      },
    },
  };
  let properties = {};

  describe("msg", function() {
    it("should send msg", function() {
      let cmd = {
        scserver: {
          msg: ["/s_new", "sin", 1000, 0, 1],
        },
      };

      scserver(cmd, context as any, properties);
      expect(context.scserver.send.bundle).toHaveBeenCalled();
    });
  });
});
