const SynthEventList = require('../SynthEventList').default;
const _ = require('lodash');
const Bacon = require('baconjs').Bacon;

describe('SynthEventList', function() {
  let events = [{ defName: 'blip', args: { freq: 440 }, time: 1.0 }];
  let context = {
    group: 0,
    out: 0,
    epoch: 1460987712857
  };

  // bad to mock this, it's fragile
  let player = {
    updateContext: (ctx, update) => _.assign({}, ctx, update),
    callCommand: function(/*id, command*/) {}
  };

  describe('_makeMsgs', function() {
    // context group epoch
    let sel = new SynthEventList();
    let scheded = sel._makeMsgs(events, context);
    let first = scheded[0];

    it('should have events in the packet', function() {
      expect(scheded.length).toEqual(1);
    });

    it('should have a msgs array', function() {
      expect(_.isArray(first.msgs)).toBe(true);
      expect(_.isArray(first.msgs[0])).toBe(true);
    });
  });

  describe('spawn events in supplied list on .add', function() {
    let props = { events };
    let sel = new SynthEventList(props);
    let commands = sel.add(player);
    it('should contain a function', function() {
      expect(typeof commands.scserver.schedLoop).toBe('function');
    });
    it('should schedule 1 event', function() {
      let fn = commands.scserver.schedLoop(context, props);
      let e = fn(0);
      expect(e.event.time).toEqual(1);
    });
  });

  describe('pass in updateStream', function() {
    var bus, sel, dp, updated, called, properties;
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
        }
      };
    });

    it('should set updateStream', function() {
      expect(sel.properties.updateStream).toBeDefined();
    });

    it('should subscribe to stream on .add', function() {
      spyOn(player, 'updateContext');

      let commands = sel.add(dp);
      commands.run(context, properties);
      expect(updated).toBeTruthy(); // {subscription: bacon subscription}
    });

    it('should get a new event when pushed to bus', function() {
      spyOn(player, 'callCommand');
      let commands = sel.add(dp);
      commands.run(context, properties);
      bus.push({
        events: [{ defName: 'nuevo-blip', args: { freq: 441 }, time: 2.0 }]
      });
      expect(called).toBeDefined();
      expect(called.scserver).toBeTruthy(); // scserver command
    });
  });
});
