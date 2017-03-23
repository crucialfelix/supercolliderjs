/**
 * @flow
 * @module allocators
 * @ private
 */
import * as Immutable from 'immutable';

// immutable list of numbers
type BlockMapType = Immutable.Map<string, *>;

/**
 * A simple incrementing allocator used for nodeIds.
 *
 * The return type is designed to be consistent with the block allocator
 * and other mutating functions used by Server
 *
 * @param {int} state
 * @param {int} initial
 * @returns {Array} [next {int}, state {int}]
 */
export function increment(
  state: number,
  initial: number = 0
): [number, number] {
  let next = (state || initial) + 1;
  return [next, next];
}

/**
 * Create initial state for block allocator.
 *
 * @param {int} initialSize - eg. total numChannels
 * @returns {Immutable.Map} state
 */
export function initialBlockState(initialSize: number): BlockMapType {
  return freeBlock(Immutable.fromJS({}), 0, initialSize);
}

/**
 * Allocates a contigious block of numbers.
 *
 * @param {Immutable.Map} state
 * @param {int} blockSize       - number of numbers eg. numChannels
 * @returns {Array}             - [start number {int}, mutated state {Immutable.Map}]
 */
export function allocBlock(
  state: BlockMapType,
  blockSize: number
): [number, BlockMapType] {
  let keys = state.keySeq().sortBy((a, b) => parseInt(a, 10) > parseInt(b, 10));
  var ret;
  keys.forEach(sizeKey => {
    let size = parseInt(sizeKey, 10);
    if (size >= blockSize) {
      let blocks = state.get(sizeKey);
      if (blocks && blocks.size) {
        if (size === blockSize) {
          // pop the last free one
          ret = [blocks.last(), state.set(sizeKey, blocks.butLast())];
          return false; // break
        } else {
          // its larger, split off what you need
          let lastBlock = blocks.last();
          ret = [
            lastBlock,
            splitFreeBlock(state, lastBlock, size, lastBlock, blockSize)
          ];
          return false; // break
        }
      }
    }
  });

  if (!ret) {
    throw new Error('No free block');
  }
  return ret;
}

/**
 * Return a previously allocated block back to the free list.
 *
 * Defragments by merging with adjoining neighbors where possible
 *
 * @param {Immutable.Map} state
 * @param {int} addr
 * @param {int} blockSize
 * @returns {Immutable.Map} state
 */
export function freeBlock(
  state: BlockMapType,
  addr: number,
  blockSize: number
) {
  state = pushFreeBlock(state, addr, blockSize);
  return mergeNeighbors(state, addr, blockSize);
}

/**
 * Reserve a block by re-writing the free list
 *
 * @param {Immutable.Map} state
 * @param {int} addr
 * @param {int} blockSize
 * @returns {Immutable.Map} state
 * @throws - Block is already allocated
 */
export function reserveBlock(
  state: BlockMapType,
  addr: number,
  blockSize: number
): BlockMapType {
  // check if exact match is on free list
  var removed = state.update(
    String(blockSize),
    blks => blks ? blks.filter(x => x !== addr) : blks
  );
  if (removed !== state) {
    return removed;
  }

  var enc = findEnclosingFreeBlock(state, addr, blockSize);
  if (enc === NOT_FOUND) {
    throw Error('Block is already allocated', addr, blockSize, state);
  }

  return splitFreeBlock(state, enc[0], enc[1], addr, blockSize);
}

/**
 * Returns a list of the free blocks and their sizes.
 *
 * @param {Immutable.Map} state
 * @returns {Array} - [[addr, size], ...]
 */
export function freeBlockList(state: BlockMapType): Array<[number]> {
  var list = [];
  state.forEach((blks, sizeKey) => {
    blks.forEach(addr => {
      list.push([addr, parseInt(sizeKey, 10)]);
    });
  });
  // sort by addr
  list.sort((a, b) => a[0] - b[0]);
  return list;
}

/************ private *****************************************/

const NOT_FOUND = [-1, -1];

/**
 * @param {Immutable.Map} state
 * @param {int} addr
 * @param {int} blockSize
 * @returns {Array} - [blockAddr, blockSize] or NOT_FOUND
 */
function findEnclosingFreeBlock(
  state: BlockMapType,
  addr: number,
  blockSize: number
): [number, number] {
  // let end = addr + blockSize;
  var found = NOT_FOUND;
  state.forEach((blks, sizeKey) => {
    let freeBlockSize = parseInt(sizeKey, 10);
    blks.forEach(fblock => {
      if (blockEncloses(addr, blockSize, fblock, freeBlockSize)) {
        found = [fblock, freeBlockSize];
        return false; // break
      }
    });
    if (found !== NOT_FOUND) {
      return false; // break
    }
  });
  return found;
}

/**
 * Tests if a block encloses another block
 *
 * @param {int} addr      - child block
 * @param {int} size
 * @param {int} encBlock - address of the potentially enclosing block being tested
 * @param {int} encSize  - size of the potentially enclosing block being tested
 * @returns {Boolean}
 */
function blockEncloses(
  addr: number,
  size: number,
  encBlock: number,
  encSize: number
): boolean {
  return addr >= encBlock && addr + size <= encBlock + encSize;
}

/**
 * @param {Immutable.Map} state
 * @param {int} addr
 * @param {int} blockSize
 * @returns {Immutable.Map} state
 */
function popFreeBlock(
  state: BlockMapType,
  addr: number,
  blockSize: number
): BlockMapType {
  return state.update(
    String(blockSize),
    blks => blks ? blks.filter(x => x !== addr) : blks
  );
}

/**
 * @param {Immutable.Map} state
 * @param {int} addr
 * @param {int} blockSize
 * @returns {Immutable.Map} state
 */
function pushFreeBlock(
  state: BlockMapType,
  addr: number,
  blockSize: number
): BlockMapType {
  return state.update(String(blockSize), blks =>
    (blks || Immutable.List()).push(addr));
}

/**
 * Split a block into two or three parts.
 *
 * addr/blockSize is the original block that is currently in state.
 * splitAddr/splitSize is being removed from it (its being allocated)
 * and the original free block will be resized
 *
 * If splitAddr/splitSize is at the top or bottom edge then you get 2 parts.
 * If in the middle then you get 3.
 *
 * @param {Immutable.Map} state
 * @param {int} addr
 * @param {int} blockSize
 * @param {int} splitAddr
 * @param {int} splitSize
 * @returns {Immutable.Map} state
 */
function splitFreeBlock(
  state: BlockMapType,
  addr: number,
  blockSize: number,
  splitAddr: number,
  splitSize: number
): BlockMapType {
  var bottomGap = splitAddr - addr;
  var topGap = endAddr(addr, blockSize) - endAddr(splitAddr, splitSize);
  if (bottomGap > 0 && topGap === 0) {
    return resizeFreeBlock(state, addr, blockSize, addr, bottomGap);
  }
  if (topGap > 0 && bottomGap === 0) {
    return resizeFreeBlock(
      state,
      addr,
      blockSize,
      endAddr(addr, blockSize) - topGap,
      topGap
    );
  }
  if (topGap > 0 && bottomGap > 0) {
    state = popFreeBlock(state, addr, blockSize);
    state = pushFreeBlock(state, addr, bottomGap);
    state = pushFreeBlock(state, endAddr(addr, blockSize) - topGap, topGap);
    return state;
  }
  return state;
}

function resizeFreeBlock(
  state: BlockMapType,
  addr: number,
  blockSize: number,
  newAddr: number,
  newSize: number
): BlockMapType {
  state = popFreeBlock(state, addr, blockSize);
  state = pushFreeBlock(state, newAddr, newSize);
  return state;
}

function endAddr(addr: number, blockSize: number): number {
  return addr + blockSize;
}

function mergeNeighbors(
  state: BlockMapType,
  addr: number,
  blockSize: number
): BlockMapType {
  var blockEnd = endAddr(addr, blockSize);
  freeBlockList(state).forEach(fb => {
    if (endAddr(fb[0], fb[1]) === addr) {
      // lower neighbor
      state = popFreeBlock(state, fb[0], fb[1]);
      state = popFreeBlock(state, addr, blockSize);
      // this is the new me
      addr = fb[0];
      blockSize = fb[1] + blockSize;
      state = pushFreeBlock(state, addr, blockSize);
    }
    // my end addr is still in the same place
    // even if block has been merged with lower neighbor
    if (fb[0] === blockEnd) {
      // upper neighbor
      state = popFreeBlock(state, fb[0], fb[1]);
      state = popFreeBlock(state, addr, blockSize);
      blockSize = blockSize + fb[1];
      state = pushFreeBlock(state, addr, blockSize);
    }
  });
  return state;
}
