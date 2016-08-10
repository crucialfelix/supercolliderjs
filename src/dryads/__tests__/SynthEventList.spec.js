
jest.dontMock('../SynthEventList');
const SynthEventList = require('../SynthEventList').default;
const _ = require('underscore');
const Bacon = require('baconjs').Bacon;

describe('SynthEventList', function() {
  let events = [
    {defName: 'blip', args: {freq: 440}, time: 1.0}
  ];
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

  describe('_makeSchedLoop', function() {

    let sel = new SynthEventList();
    let epoch = 1460987712857;
    let msg = ['/s_new', 'blip', -1, 1, 0, 'out', 0, 'freq', 440];

    describe('with no loopTime', function() {
      let loopTime = null;
      it('should return first event with time 1.0', function() {
        let fn = sel._makeSchedLoop(events, loopTime, epoch, context);
        let e = fn(0);
        expect(e).toEqual({
          time: 1,
          msgs: [msg],
          memo: {i: 1}
        });
      });

      it('should return undefined event with time 10.0', function() {
        let fn = sel._makeSchedLoop(events, loopTime, epoch, context);
        let e = fn(10);
        expect(e).toEqual(undefined);
      });
    });

    describe('with loopTime', function() {
      let loopTime = 2;
      it('should return first event with time 1.0', function() {
        let fn = sel._makeSchedLoop(events, loopTime, epoch, context);
        let e = fn(0);
        expect(e).toEqual({
          time: 1,
          msgs: [msg],
          memo: {i: 1}
        });
      });

      it('should return first event again with time 10.0', function() {
        let fn = sel._makeSchedLoop(events, loopTime, epoch, context);
        let e = fn(10);
        let should = {time: 11, msgs: [msg], memo: {i: 1}};
        expect(e).toEqual(should);
      });

      it('should wrap memo iterator around and find first event', function() {
        let fn = sel._makeSchedLoop(events, loopTime, epoch, context);
        let e = fn(4, {i: 1});
        expect(e).toEqual({
          time: 5.0,
          msgs: [msg],
          memo: {i: 1}
        });
      });

      it('should return undefined if the list is empty', function() {
        let fn = sel._makeSchedLoop([], loopTime, epoch, context);
        let e = fn(4, {i: 1});
        expect(e).toEqual(undefined);
      });

      it('should return next event even if epoch is in the future', function() {
        let fn = sel._makeSchedLoop(events, 4, epoch, context);
        // now is -0.5 secs before start
        // next event should still be time 1
        // and the scheduler will handle it
        let e = fn(-0.5, {i: 1});
        expect(e).toEqual({
          time: 1.0,
          msgs: [msg],
          memo: {i: 1}
        });
      });

    });

    describe('with event list in properties', function() {
      let sel2 = new SynthEventList({
        events: [
          {
            time: 1,
            defName: 'blip',
            args: {
              freq: 440
            }
          }
        ],
        loopTime: 16.0
      });

      let ctx = {};
      let cmd = sel2.add(ctx);
      let getNextFn = cmd.scserver.schedLoop(ctx);

      it('should return first event', function() {
        let e = getNextFn(0);
        expect(e.time).toEqual(1);
        expect(e.msgs[0]).toEqual(msg);
      });
    });

    describe('with no event list in properties', function() {
      let sel2 = new SynthEventList({
        loopTime: 16.0
      });

      let ctx = {};
      let cmd = sel2.add(ctx);
      let getNextFn = cmd.scserver.schedLoop(ctx);

      it('should return undefined', function() {
        let e = getNextFn(0);
        expect(e).toBe(undefined);
      });
    });
  });

  describe('spawn events in supplied list on .add', function() {
    let sel = new SynthEventList({events: events});
    let commands = sel.add(player);
    it('should contain a function', function() {
      expect(typeof commands.scserver.schedLoop).toBe('function');
    });
    it('should schedule 1 event', function() {
      let fn = commands.scserver.schedLoop(context);
      let e = fn(0);
      expect(e.time).toEqual(1);
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
