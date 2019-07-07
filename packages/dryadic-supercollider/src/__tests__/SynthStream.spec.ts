import { Bus } from "baconjs";
import _ from "lodash";

import Server from "../../server/server";
import SynthStream, { Event } from "../SynthStream";

describe("SynthStream", function() {
  const stream = new Bus<any, Event>();
  let properties = {
    stream,
  };
  let ss = new SynthStream(properties);

  it("should construct", function() {
    expect(ss).toBeTruthy();
  });

  describe("commandsForEvent", function() {
    it("has 1 message with no event.id supplied", function() {
      let event = {
        type: "noteOn",
        defName: "sin",
        args: {},
      };
      let context = {
        id: "ss",
        scserver: new Server(),
      };

      // cannot read state  of undefined
      let cmds = ss.commandsForEvent(event, context, properties);
      expect(cmds.scserver.bundle.packets.length).toBe(1);
    });

    it("noteOn with event.key should updateContext and s_new", function() {
      let event = {
        type: "noteOn",
        defName: "sin",
        key: 1,
      };
      let context = {
        id: "ss",
        scserver: new Server(),
      };

      let cmds = ss.commandsForEvent(event, context, properties);
      expect(cmds.updateContext).toBeTruthy();
      // assumes that Server nextNode returned 1000
      expect(cmds.scserver.bundle.packets).toEqual([["/s_new", "sin", 1000, 1, 0, "out", 0]]);
    });

    it("noteOff with event.key should updateContext and s_", function() {
      let noteOn = {
        type: "noteOn",
        defName: "sin",
        key: 1,
      };

      let noteOff = {
        type: "noteOff",
        defName: "sin",
        key: 1,
      };

      let context = {
        id: "ss",
        scserver: new Server(),
      };

      // call noteOn and update the context
      let cmds = ss.commandsForEvent(noteOn, context, properties);
      _.assign(context, cmds.updateContext);

      // now call noteOff
      let cmds2 = ss.commandsForEvent(noteOff, context, properties);
      expect(cmds2.updateContext).toBeTruthy();
      // assumes that Server nextNode returned 1000
      expect(cmds2.scserver.bundle.packets).toEqual([["/n_free", 1000]]);
    });

    // no defName in event or default should not return anything
  });
});
