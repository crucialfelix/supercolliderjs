/**
 * OSC utilities
 */
import { MsgType, OSCBundle, OSCMessage, OSCTimeType } from "@supercollider/osc";

/**
 * Converts a message received from scsynth:
 *
 * ```js
 *  {address: '/n_go',
 *    args:
 *     [ 1000 ,
 *       0 ,
 *       -1 ,
 *       3 ,
 *       0  ],
 *    oscType: 'message' }
 * ```
 *
 * to a flat array format:
 *
 * ```js
 * ['/n_go', 1000, 0, -1, 3, 0]
 * ```
 */
export function parseMessage(msg: OSCMessage): MsgType {
  return [msg.address, ...msg.args];
}

/**
 * Convert a simple Msg array to OSCMessage object for osc packMessage
 */
export function makeMessage(msg: MsgType): OSCMessage {
  return {
    oscType: "message",
    // first arg of MsgType is always a string
    address: msg[0],
    args: msg.slice(1),
  };
}

/**
 * Build an OSCBundle for osc packBundle
 *
 * @param {null|Number|Array|Date} time -
 *  - null: now, immediately
 *  - number: unix timestamp in seconds
 *  - Array: `[secondsSince1900Jan1, fractionalSeconds]`
 *  - Date
 * @param {Array} packets - osc messages as `[address, arg1, ...argN]`
 *                        or sub bundles as `[{timetag: , packets: }, ...]`
 */
export function makeBundle(time: OSCTimeType, packets: MsgType[]): OSCBundle {
  return {
    oscType: "bundle",
    timetag: time,
    elements: packets.map(asPacket),
  };
}

/**
 * Format children of a bundle as either OSCMessage or OSCBundle objects.
 * TODO: not supporting nested bundles yet
 */
export function asPacket(thing: MsgType): OSCMessage {
  // not supporting nested bundles right now
  // if ("timetag" in thing) {
  //   return makeBundle(thing.timetag, thing.packets);
  // }
  return makeMessage(thing);
}

export { dateToTimetag, deltaTimeTag } from "@supercollider/osc";
