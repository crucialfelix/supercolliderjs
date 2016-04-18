
jest.dontMock('../SynthEventList');
var SynthEventList = require('../SynthEventList').default;
var _ = require('underscore');
var timetagToDate = require('../../server/osc/utils').timetagToDate;
var Bacon = require('baconjs').Bacon;

describe('SynthEventList', function() {
  let events = [
    {defName: 'blip', args: {freq: 440}, time: 1.0}
  ];
  let context = {
    group: 0,
    out: 0,
    epoch: 1460987712857
  };

  let player = {
    updateContext: function(/*ctx, update*/) {},
    callCommand: function(/*id, command*/) {}
  };

  describe('_schedEvents', function() {
    // context group epoch
    let sel = new SynthEventList();
    let now = _.now();
    let scheded = sel._schedEvents(events, context, now);
    let first = scheded[0];

    it('should have events in the packet', function() {
      expect(scheded.length).toEqual(1);
    });
    it('should have a time array', function() {
      expect(_.isArray(first.time)).toBe(true);
    });
    it('should have time 1 second past the supplied epoch of "now"', function() {
      let date = timetagToDate(first.time).getTime();
      let diff = date - now;
      // within 1 millisecond of 1000
      let close = Math.abs(diff - 1000);
      expect(close < 2).toBe(true);
    });

    it('should have a packets array', function() {
      expect(_.isArray(first.packets)).toBe(true);
      expect(_.isArray(first.packets[0])).toBe(true);
    });
  });

  describe('spawn events in supplied list on .add', function() {
    let sel = new SynthEventList({events: events});
    let commands = sel.add(player);
    it('should contain a function', function() {
      expect(typeof commands.scserver.sched).toBe('function');
    });
    it('should schedule 1 event', function() {
      let scheded = commands.scserver.sched(context);
      expect(scheded.length).toEqual(1);
    });
  });

  describe('pass in updateStream', function() {
    var bus, sel, dp, updated, called;

    beforeEach(function() {
      bus = new Bacon.Bus();
      sel = new SynthEventList({updateStream: bus});

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
      commands.run(context);
      expect(updated).toBeTruthy();  // {subscription: bacon subscription}
    });

    it('should get a new event when pushed to bus', function() {
      spyOn(player, 'callCommand');
      let commands = sel.add(dp);
      commands.run(context);
      bus.push({
        events: [
          {defName: 'nuevo-blip', args: {freq: 441}, time: 2.0}
        ]
      });
      expect(called).toBeDefined();
      expect(called.scserver).toBeTruthy();  // scserver command
    });
  });
});
