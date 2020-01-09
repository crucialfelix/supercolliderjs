import Bacon from "baconjs";
import _ from "lodash";

import SynthEventList from "../SynthEventList";

describe("SynthEventList", function() {
  const events = [{ defName: "blip", args: { freq: 440 }, time: 1.0 }];
  const context = {
    group: 0,
    out: 0,
    epoch: 1460987712857,
    id: "id",
  };

  // bad to mock this, it's fragile
  const player = {
    updateContext: (ctx, update) => _.assign({}, ctx, update),
    callCommand: function(/*id, command*/) {},
  };

  describe("_makeMsgs", function() {
    // context group epoch
    const sel = new SynthEventList();
    const scheded = sel["_makeMsgs"](events, context);
    const first = scheded[0];

    it("should have events in the packet", function() {
      expect(scheded.length).toEqual(1);
    });

    it("should have a msgs array", function() {
      expect(_.isArray(first.msgs)).toBe(true);
      expect(_.isArray(first.msgs[0])).toBe(true);
    });
  });

  describe("spawn events in supplied list on .add", function() {
    const props = { events };
    const sel = new SynthEventList(props);
    const commands: any = sel.add(player as any);
    it("should contain a function", function() {
      expect(typeof commands.scserver.schedLoop).toBe("function");
    });
    it("should schedule 1 event", function() {
      const fn = commands.scserver.schedLoop(context, props);
      const e = fn(0);
      expect(e.event.time).toEqual(1);
    });
  });

  describe("pass in updateStream", function() {
    let bus, sel: SynthEventList, dp, updated, called, properties;
    beforeEach(function() {
      bus = new Bacon.Bus();
      properties = { updateStream: bus };
      sel = new SynthEventList(properties);

      dp = {
        updateContext: function(ctx, update) {
          updated = update;
        },
        callCommand: function(id, command) {
          called = command;
        },
      };
    });

    it("should subscribe to stream on .add", function() {
      spyOn(player, "updateContext");

      const commands = sel.add(dp);
      if (commands.run) {
        commands.run(context, properties);
        expect(updated).toBeTruthy(); // {subscription: bacon subscription}
      } else {
        throw new Error("command does not have 'run' defined");
      }
    });

    it("should get a new event when pushed to bus", function() {
      spyOn(player, "callCommand");
      const commands = sel.add(dp);
      if (commands.run) {
        commands.run(context, properties);
        bus.push({
          events: [{ defName: "nuevo-blip", args: { freq: 441 }, time: 2.0 }],
        });
        expect(called).toBeDefined();
        expect(called.scserver).toBeTruthy(); // scserver command
      } else {
        throw new Error("command does not have 'run' defined");
      }
    });
  });
});
