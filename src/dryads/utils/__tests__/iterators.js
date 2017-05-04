const iterators = require('../iterators');

describe('iterators', function() {
  describe('eventListIterator', function() {
    let events = [
      { defName: 'zero', args: { freq: 440 }, time: 0.0 },
      { defName: 'one', args: { freq: 440 }, time: 1.0 },
      { defName: 'one-b', args: { freq: 880 }, time: 1.0 }
    ];

    describe('with no memo', function() {
      let fn = iterators.eventListIterator(events);

      it('should find first event at time 0', function() {
        let e = fn(0);
        expect(e.event.time).toEqual(0);
      });

      it('should find second event at time 1', function() {
        let e = fn(1);
        expect(e.event.time).toEqual(1);
        expect(e.event.defName).toEqual('one');
      });

      it('should return undefined at time 2', function() {
        let e = fn(2);
        expect(e).toBeUndefined();
      });
    });

    describe('with memo', function() {
      let fn = iterators.eventListIterator(events);

      it('should find first event with i=0', function() {
        let e = fn(0, { i: 0 });
        expect(e.event.time).toEqual(0);
      });

      it('should find second event with i=1', function() {
        let e = fn(0, { i: 1 });
        expect(e.event.time).toEqual(1);
        expect(e.event.defName).toEqual('one');
      });

      it('should find third event with i=2', function() {
        let e = fn(0, { i: 2 });
        expect(e.event.time).toEqual(1);
        expect(e.event.defName).toEqual('one-b');
      });

      it('should return undefined with i=3', function() {
        let e = fn(0, { i: 3 });
        expect(e).toBeUndefined();
      });
    });
  });

  describe('loopEventListIterator', function() {
    let events = [
      { defName: 'zero', args: { freq: 440 }, time: 0.0 },
      { defName: 'one', args: { freq: 440 }, time: 1.0 },
      { defName: 'one-b', args: { freq: 880 }, time: 1.0 }
    ];

    describe('with no memo', function() {
      let fn = iterators.loopedEventListIterator(events, 4);

      it('should find first event at time 0', function() {
        let e = fn(0);
        expect(e).toBeDefined();
        expect(e.event.time).toEqual(0);
        expect(e.memo).toEqual({ i: 1 });
      });

      it('should find second event at time 1', function() {
        let e = fn(1);
        expect(e).toBeDefined();
        expect(e.event.time).toEqual(1);
        expect(e.event.defName).toEqual('one');
        expect(e.memo).toEqual({ i: 2 });
      });

      it('should return first event, 1st iteration at time 2', function() {
        let e = fn(2);
        expect(e).toBeDefined();
        expect(e.event.time).toEqual(4);
        expect(e.event.defName).toEqual('zero');
        expect(e.memo).toEqual({ i: 1 });
      });

      it('should return first event, 4th iteration at time 15', function() {
        let e = fn(15);
        expect(e).toBeDefined();
        expect(e.event.time).toEqual(16);
        expect(e.event.defName).toEqual('zero');
        expect(e.memo).toEqual({ i: 10 });
      });

      it('should find first event with time -1.9', function() {
        let e = fn(-1.9);
        expect(e).toBeDefined();
        expect(e.event.time).toEqual(0);
        expect(e.event.defName).toEqual('zero');
        expect(e.memo).toEqual({ i: 1 });
      });
    });

    describe('with memo', function() {
      let fn = iterators.loopedEventListIterator(events, 4);

      it('should find first event with i=0', function() {
        let e = fn(0, { i: 0 });
        expect(e).toBeDefined();
        expect(e.event.time).toEqual(0);
      });

      it('should find second event with i=1', function() {
        let e = fn(0, { i: 1 });
        expect(e).toBeDefined();
        expect(e.event.time).toEqual(1);
        expect(e.event.defName).toEqual('one');
      });

      it('should find third event with i=2', function() {
        let e = fn(0, { i: 2 });
        expect(e).toBeDefined();
        expect(e.event.time).toEqual(1);
        expect(e.event.defName).toEqual('one-b');
      });

      it('should find first event wrapped with i=3', function() {
        let e = fn(0, { i: 3 });
        expect(e).toBeDefined();
        expect(e.event.time).toEqual(4);
        expect(e.event.defName).toEqual('zero');
      });
    });
  });
});
