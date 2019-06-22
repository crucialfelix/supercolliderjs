/**
 * OSC utilities
 *
 * @module utils
 * @flow
 */

import _ from 'lodash';
import * as osc from 'osc-min';
import type { MsgType, OSCMinMsgType, OSCTimeType } from '../../Types';

/**
  * Convert full OSC message to a simple Array
  *
  * Converts:
  *
  * ```js
  *  {address: '/n_go',
  *    args:
  *     [ Object { type: 'integer', value: 1000 },
  *       Object { type: 'integer', value: 0 },
  *       Object { type: 'integer', value: -1 },
  *       Object { type: 'integer', value: 3 },
  *       Object { type: 'integer', value: 0 } ],
  *    oscType: 'message' }
  * ```
  *
  * to:
  *
  * ```js
  * ['/n_go', 1000, 0, -1, 3, 0]
  * ```
 */
export function parseMessage(msg: OSCMinMsgType): MsgType {
  if (msg.oscType === 'bundle') {
    return [timetagToDate(msg.timetag)].concat(msg.elements.map(parseMessage));
  }
  // for each msg.arg pluck just value
  return [msg.address].concat(msg.args.map(a => a.value));
}

/**
 * Format an object for osc-min message
 */
export function makeMessage(msg: MsgType): OSCMinMsgType {
  return {
    oscType: 'message',
    address: msg[0],
    args: msg.slice(1)
  };
}

// export function checkTypes(input:[any]) : MsgType {
// _.each(input, (inp, i) => {
//   console.log(inp, typeof inp);
//   switch (typeof inp) {
//     case 'string':
//     case 'number':
//     case 'object':
//       break;
//     default:
//       throw new Error(`Invalid OSC Type at index ${i}: ${inp} of ${input}`);
//   }
// });

//   return input;
// }

/**
 * Format an object for osc-min bundle
 *
 * @param {null|Number|Array|Date} time -
 *  - null: now, immediately
 *  - number: unix timestamp in seconds
 *  - Array: `[secondsSince1900Jan1, fractionalSeconds]`
 *  - Date
 * @param {Array} packets - osc messages as `[address, arg1, ...argN]`
 *                        or sub bundles as `[{timeTag: , packets: }, ...]`
 */
export function makeBundle(
  time: OSCTimeType,
  packets: [MsgType]
): OSCMinMsgType {
  return {
    oscType: 'bundle',
    timetag: time,
    elements: _.map(packets, asPacket)
  };
}

/**
 * Format children of a bundle as either message or bundle objects.
 *
 * @private
 */
export function asPacket(thing: [MsgType] | MsgType): OSCMinMsgType {
  if (_.isArray(thing)) {
    return makeMessage(thing);
  }
  let bundle = (thing: MsgType); // typecast
  return makeBundle(bundle.timeTag, bundle.packets || []);
}

/**
 * Convert a timetag array to a JavaScript Date object in your local timezone.
 *
 * Received OSC bundles that were converted with `fromBuffer` will have a timetag array:
 * `[secondsSince1970, fractionalSeconds]`
 *
 * That has an accuracy of 0.00000000023283 seconds or 2^32 per second or 4,294,979,169.35102864751106 per second.
 *
 * Note that the sample rate for audio is usually only 44.1kHz.
 *
 * timetagToDate reduces the accuracy but is useful for logging a human readable date.
 *
 * Accuracy is reduced to milliseconds, but the returned `Date` object also has
 * `fractionalSecondsInt` and `fractionalSecondsFloat` properties set.
 *
 * @param {Array} ntpTimeTag
 * @returns {Date}
 */
export const timetagToDate = osc.timetagToDate;

/**
 * Convert a JavaScript Date to a NTP timetag array `[secondsSince1970, fractionalSeconds]`.
 *
 * `toBuffer` already accepts Dates for timetags so you might not need this function.
 * If you need to schedule bundles with sub-millisecond accuracy then you
 * could use this to help assemble the NTP array.
 */
export const dateToTimetag = osc.dateToTimetag;

/**
 * Make NTP timetag array relative to the current time.
 *
 * @param seconds  - seconds relative to now
 * @param now      - JavaScript timestamp in milliseconds
 * @return `[ntpSecs, ntpFracs]`
 */
export function deltaTimeTag(seconds: number, now: ?number): [number, number] {
  const d = (now || _.now()) / 1000 + (seconds || 0);
  return osc.timestampToTimetag(d);
}
