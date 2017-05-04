import _ from 'lodash';
const SynthStream = require('../SynthStream').default;

describe('SynthStream', function() {
  let properties = {};
  let ss = new SynthStream(properties);

  it('should construct', function() {
    expect(ss).toBeTruthy();
  });

  describe('commandsForEvent', function() {
    it('has 1 message with no event.id supplied', function() {
      let event = {
        type: 'noteOn',
        defName: 'sin'
      };

      let cmds = ss.commandsForEvent(event, {}, properties);
      expect(cmds.scserver.bundle.packets.length).toBe(1);
    });

    it('noteOn with event.key should updateContext and s_new', function() {
      let event = {
        type: 'noteOn',
        defName: 'sin',
        key: 1
      };
      let context = {
        scserver: {
          state: {
            nextNodeID: jest.fn(() => 1001)
          }
        }
      };

      let cmds = ss.commandsForEvent(event, context, properties);
      expect(cmds.updateContext).toBeTruthy();
      expect(cmds.scserver.bundle.packets).toEqual([
        ['/s_new', 'sin', 1001, 1, 0, 'out', 0]
      ]);
    });

    it('noteOff with event.key should updateContext and s_', function() {
      let noteOn = {
        type: 'noteOn',
        defName: 'sin',
        key: 1
      };

      let noteOff = {
        type: 'noteOff',
        key: 1
      };

      let context = {
        scserver: {
          state: {
            nextNodeID: jest.fn(() => 1001)
          }
        }
      };

      // call noteOn and update the context
      let cmds = ss.commandsForEvent(noteOn, context, properties);
      _.assign(context, cmds.updateContext);

      // now call noteOff
      let cmds2 = ss.commandsForEvent(noteOff, context, properties);
      expect(cmds2.updateContext).toBeTruthy();
      expect(cmds2.scserver.bundle.packets).toEqual([['/n_free', 1001]]);
    });

    // no defName in event or default should not return anything
  });
});
