/**
 * @module allocators
 * @ private
 */
import { Map, List } from "immutable";

// immutable list of numbers
type BlockMapType = Map<string, List<number>>;

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
export function increment(state: number, initial = 0): [number, number] {
  // let next = (typeof state === "undefined" ? initial : state) + 1;
  const next = (state || initial) + 1;
  return [next, next];
}

/**
 * Create initial state for block allocator.
 *
 * @param {int} initialSize - eg. total numChannels
 * @returns {Immutable.Map} state
 */
export function initialBlockState(initialSize: number): BlockMapType {
  const blank: BlockMapType = Map<List<number>>({});
  return freeBlock(blank, 0, initialSize);
}

/**
 * Allocates a contigious block of numbers.
 *
 * @param {Immutable.Map} state
 * @param {int} blockSize       - number of numbers eg. numChannels
 * @returns {Array}             - [start number {int}, mutated state {Immutable.Map}]
 */
export function allocBlock(state: BlockMapType, blockSize: number): [number, BlockMapType] {
  const keys = state.keySeq().sortBy((value, key) => parseInt(value || "0", 10) > (key || 0));
  let ret: [number, BlockMapType] | undefined;
  keys.forEach((sizeKey): void | false => {
    if (typeof sizeKey !== "undefined") {
      const size = parseInt(sizeKey, 10);
      if (size >= blockSize) {
        const blocks = state.get(sizeKey);
        if (blocks.size) {
          if (size === blockSize) {
            // pop the last free one
            ret = [blocks.last(), state.set(sizeKey, blocks.butLast().toList())];
            return false; // break
          } else {
            // its larger, split off what you need
            const lastBlock = blocks.last();
            ret = [lastBlock, splitFreeBlock(state, lastBlock, size, lastBlock, blockSize)];
            return false; // break
          }
        }
      }
    }
  });

  if (!ret) {
    throw new Error("No free block");
  }
  return ret;
}

/**
 * Return a previously allocated block back to the free list.
 *
 * Defragments by merging with adjoining neighbors where possible
 *
 */
export function freeBlock(state: BlockMapType, addr: number, blockSize: number): BlockMapType {
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
export function reserveBlock(state: BlockMapType, addr: number, blockSize: number): BlockMapType {
  // check if exact match is on free list
  const removed = state.update(String(blockSize), blks => (blks ? blks.filter(x => x !== addr).toList() : blks));
  if (removed !== state) {
    return removed;
  }

  const enc = findEnclosingFreeBlock(state, addr, blockSize);
  if (enc === NOT_FOUND) {
    throw new Error(`Block is already allocated! addr:${addr} blockSize:${blockSize} state:${state}`);
  }

  return splitFreeBlock(state, enc[0], enc[1], addr, blockSize);
}

/**
 * Returns a list of the free blocks and their sizes.
 *
 * @param {Immutable.Map} state
 * @returns {Array} - [[addr, size], ...]
 */
export function freeBlockList(state: BlockMapType): FreeBlock[] {
  const list: FreeBlock[] = [];
  state.forEach((blks, sizeKey) => {
    if (blks !== undefined) {
      blks.forEach(addr => {
        if (addr !== undefined) {
          list.push([addr, parseInt(sizeKey || "0", 10)]);
        }
      });
    }
  });

  // sort by addr
  list.sort((a, b) => a[0] - b[0]);

  return list;
}

/************ private *****************************************/

type FreeBlock = [number, number];
const NOT_FOUND: FreeBlock = [-1, -1];

/**
 * @param {Immutable.Map} state
 * @param {int} addr
 * @param {int} blockSize
 * @returns {Array} - [blockAddr, blockSize] or NOT_FOUND
 */
function findEnclosingFreeBlock(state: BlockMapType, addr: number, blockSize: number): FreeBlock {
  // let end = addr + blockSize;
  let found = NOT_FOUND;
  state.forEach((blks, sizeKey): void | false => {
    if (blks !== undefined && sizeKey) {
      const freeBlockSize = parseInt(sizeKey, 10);
      blks.forEach((fblock): void | false => {
        if (fblock !== undefined && blockEncloses(addr, blockSize, fblock, freeBlockSize)) {
          found = [fblock, freeBlockSize];
          return false; // break
        }
      });
      if (found !== NOT_FOUND) {
        return false; // break
      }
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
  // child block
  addr: number,
  size: number,
  // address of the potentially enclosing block being tested
  encBlock: number,
  // size of the potentially enclosing block being tested
  encSize: number,
): boolean {
  return addr >= encBlock && addr + size <= encBlock + encSize;
}

/**
 * @param {Immutable.Map} state
 * @param {int} addr
 * @param {int} blockSize
 * @returns {Immutable.Map} state
 */
function popFreeBlock(state: BlockMapType, addr: number, blockSize: number): BlockMapType {
  return state.update(String(blockSize), blks => (blks ? blks.filter(x => x !== addr).toList() : blks));
}

/**
 * @param {Immutable.Map} state
 * @param {int} addr
 * @param {int} blockSize
 * @returns {Immutable.Map} state
 */
function pushFreeBlock(state: BlockMapType, addr: number, blockSize: number): BlockMapType {
  return state.update(String(blockSize), blks => (blks || List()).push(addr));
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
  splitSize: number,
): BlockMapType {
  const bottomGap = splitAddr - addr;
  const topGap = endAddr(addr, blockSize) - endAddr(splitAddr, splitSize);
  if (bottomGap > 0 && topGap === 0) {
    return resizeFreeBlock(state, addr, blockSize, addr, bottomGap);
  }
  if (topGap > 0 && bottomGap === 0) {
    return resizeFreeBlock(state, addr, blockSize, endAddr(addr, blockSize) - topGap, topGap);
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
  newSize: number,
): BlockMapType {
  state = popFreeBlock(state, addr, blockSize);
  state = pushFreeBlock(state, newAddr, newSize);
  return state;
}

function endAddr(addr: number, blockSize: number): number {
  return addr + blockSize;
}

function mergeNeighbors(state: BlockMapType, addr: number, blockSize: number): BlockMapType {
  const blockEnd = endAddr(addr, blockSize);
  let nextState = state;
  freeBlockList(state).forEach(fb => {
    if (endAddr(fb[0], fb[1]) === addr) {
      // lower neighbor
      nextState = popFreeBlock(nextState, fb[0], fb[1]);
      nextState = popFreeBlock(nextState, addr, blockSize);
      // this is the new me
      addr = fb[0];
      blockSize = fb[1] + blockSize;
      nextState = pushFreeBlock(nextState, addr, blockSize);
    }
    // my end addr is still in the same place
    // even if block has been merged with lower neighbor
    if (fb[0] === blockEnd) {
      // upper neighbor
      nextState = popFreeBlock(nextState, fb[0], fb[1]);
      nextState = popFreeBlock(nextState, addr, blockSize);
      blockSize = blockSize + fb[1];
      nextState = pushFreeBlock(nextState, addr, blockSize);
    }
  });
  return nextState;
}
