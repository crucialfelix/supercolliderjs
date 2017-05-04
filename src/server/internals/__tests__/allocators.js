var alloc = require('../allocators');
// doesnt work for jest:
// import * as alloc from '../allocators';

describe('inc', function() {
  it('should inc from null to 1', function() {
    var [n, s] = alloc.increment();
    expect(n).toEqual(1);
    expect(s).toEqual(1);
  });

  it('should inc from 1 to 2', function() {
    var [n, s] = alloc.increment(1);
    expect(n).toEqual(2);
    expect(s).toEqual(2);
  });
});

describe('block allocator', function() {
  var is;
  beforeEach(function() {
    is = alloc.initialBlockState(8);
  });

  function expectFreeToBe(state, toBe) {
    var fb = alloc.freeBlockList(state);
    expect(fb).toEqual(toBe);
  }

  describe('initialBlockState', function() {
    it('should be an Immutable', function() {
      // Map { "16": List [ 0 ] }
      var state = alloc.initialBlockState(16);
      var fb = alloc.freeBlockList(state);
      expect(fb).toEqual([[0, 16]]);
    });
  });

  describe('reserveBlock', function() {
    it('should split off a bottom chunk', function() {
      var state = alloc.reserveBlock(is, 0, 2);
      var fb = alloc.freeBlockList(state);
      expect(fb).toEqual([[2, 6]]);
    });

    it('should split off top chunk', function() {
      var state = alloc.reserveBlock(is, 6, 2);
      var fb = alloc.freeBlockList(state);
      expect(fb).toEqual([[0, 6]]);
    });

    it('should reserve block in middle', function() {
      var state = alloc.reserveBlock(is, 2, 4);
      var fb = alloc.freeBlockList(state);
      expect(fb).toEqual([[0, 2], [6, 2]]);
    });

    it('should grab the exact match', function() {
      // setup
      var state = alloc.reserveBlock(is, 0, 2);
      state = alloc.reserveBlock(state, 6, 2);
      var fb = alloc.freeBlockList(state);
      expect(fb).toEqual([[2, 4]]);

      // test
      var grabbed = alloc.reserveBlock(state, 2, 4);
      fb = alloc.freeBlockList(grabbed);
      expect(fb).toEqual([]);
    });
  });

  describe('alloc', function() {
    it('should alloc a 2 chan', function() {
      var [addr, state] = alloc.allocBlock(is, 2);
      expect(addr).toBe(0);
      var fb = alloc.freeBlockList(state);
      // there should be one 6 block left
      expect(fb).toEqual([[2, 6]]);
    });

    it('should alloc a 2 chan, twice', function() {
      var [addr, state] = alloc.allocBlock(is, 2);
      [addr, state] = alloc.allocBlock(state, 2);

      expect(addr).toBe(2);
      var fb = alloc.freeBlockList(state);
      // there should be one 4 block left
      expect(fb).toEqual([[4, 4]]);
    });

    it('should throw on allocation failed', function() {
      var state = alloc.reserveBlock(is, 0, 8);

      expect(() => alloc.allocBlock(state, 2)).toThrow();
    });

    // find free space of 2 after a free space of 4
    it('should find free space of 2 after a free space of 4', function() {
      // 2:0
      is = alloc.reserveBlock(is, 0, 2);
      is = alloc.reserveBlock(is, 4, 4);
      var [b, state] = alloc.allocBlock(is, 2);
      expect(b).toBe(2);

      var fb = alloc.freeBlockList(state);
      expect(fb).toEqual([]);
    });
  });

  describe('freeBlock', function() {
    it('should free a 2 chan', function() {
      var [addr, state] = alloc.allocBlock(is, 2);
      state = alloc.freeBlock(state, addr, 2);
      expectFreeToBe(state, [[0, 8]]);
    });

    it('should merge new free block with existing top free block', function() {
      var state = alloc.reserveBlock(is, 6, 2);
      state = alloc.freeBlock(state, 6, 2);
      expectFreeToBe(state, [[0, 8]]);
    });
  });
});
