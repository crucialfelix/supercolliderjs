/**
 * OSC utilities

 * This presents a different API than osc-min offers
 *
 * @module utils
 *
 * Wrappers for functions in node-osc-min.
 */

import _ from "lodash";
import * as osc from "osc-min";
import { MsgType, OscType, OSCTimeType } from "../osc-types";

// For osc-min library

interface OSCMsg {
  address: string;
}

// http://opensoundcontrol.org/spec-1_0

interface OSCSendMsg extends OSCMsg {
  oscType: "message";
  args: OscType[];
}

interface OSCSendBundle {
  oscType: "bundle";
  timetag: OSCTimeType;
  // according to OSC spec it can only contain bundles
  // but I was pretty sure it can contain just messages
  // and they happen at the timetag
  elements: OSCPacket[];
}

// The contents of an OSC packet must be either an OSC Message or an OSC Bundle. The first byte of the packet's contents unambiguously distinguishes between these two alternatives.
type OSCPacket = OSCSendBundle | OSCSendMsg;

interface OSCReceiveArg {
  type: "integer" | "float";
  value: number | string;
}
const OscTypeInteger: "integer" = "integer";
const OscTypeFloat: "float" = "float";
export const OSC_TYPE = {
  INTEGER: OscTypeInteger,
  FLOAT: OscTypeFloat,
};

type OscTypeMessage = "message";
export const OSC_TYPE_MESSAGE: OscTypeMessage = "message";

interface OSCReceiveMsg extends OSCMsg {
  oscType: "message";
  args: OSCReceiveArg[];
}

interface OSCReceiveBundle {
  oscType: "bundle";
  timetag: OSCTimeType;
  elements: OSCReceiveMsgOrBundle[];
}

type OSCReceiveMsgOrBundle = OSCReceiveMsg | OSCReceiveBundle;

/**
 * Convert a received OSC message to a simple Array
 *
 * Converts a message received from scsynth:
 *
 * ```js
 *  {address: '/n_go',
 *    args:
 *     [ object { type: 'integer', value: 1000 },
 *       object { type: 'integer', value: 0 },
 *       object { type: 'integer', value: -1 },
 *       object { type: 'integer', value: 3 },
 *       object { type: 'integer', value: 0 } ],
 *    oscType: 'message' }
 * ```
 *
 * to simple array format:
 *
 * ```js
 * ['/n_go', 1000, 0, -1, 3, 0]
 * ```
 */
export function parseMessage(msg: OSCReceiveMsgOrBundle): MsgType {
  if (msg.oscType === "bundle") {
    throw new Error(`Received OSC bundle: unsupported`);
    // does it ever send us bundles?
    // nothing is using this currently
    // const b: BundleType = {
    //   timetag: timetagToDate(msg.timetag),
    //   packets: msg.elements.map(parseMessage),
    // };
    // return b;
  }
  // for each msg.arg pluck just value
  const m: MsgType = [msg.address, ...msg.args.map(a => a.value)];
  return m;
}

/**
 * Format an object for osc-min message
 */
export function makeMessage(msg: MsgType): OSCSendMsg {
  return {
    oscType: "message",
    // first arg of MsgType is always a string
    address: msg[0],
    args: msg.slice(1),
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
 *                        or sub bundles as `[{timetag: , packets: }, ...]`
 */
export function makeBundle(time: OSCTimeType, packets: MsgType[]): OSCSendBundle {
  return {
    oscType: "bundle",
    timetag: time,
    // TODO elements vs packets naming
    // TODO mixed type is causing
    // Cannot invoke an expression whose type lacks a call signature.
    // Type
    //  '(<U>(callbackfn: (value: [string, ...OscType[]], index: number, array: [string, ...OscType[]][]) => U, thisArg?: any) => U[])
    // |
    //   (<U>(callbackfn: (value: BundleType, index: number, array: BundleType[]) => U, thisArg?: any) => U[])'
    // has no compatible call signatures.ts(2349)
    //
    // OSCPacket[] which is either OSCSendBundle[] | OSCSendMsg[]
    // but not mixed
    // but you are never actually sending nestsed bundles
    elements: packets.map(asPacket),
  };
}

/**
 * Format children of a bundle as either message or bundle objects.
 *
 * @private
 */
export function asPacket(thing: MsgType): OSCSendMsg {
  // not supporting nested bundles right now
  // if ("timetag" in thing) {
  //   return makeBundle(thing.timetag, thing.packets);
  // }
  return makeMessage(thing);
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
export function deltaTimeTag(seconds?: number | Date, now?: number | Date): [number, number] {
  let n: number;
  if (now) {
    n = typeof now === "number" ? now : now.getTime();
  } else {
    n = _.now();
  }

  // undefined or number
  const s = seconds || 0;
  if (typeof s === "number") {
    const d = n / 1000 + s;
    return osc.timestampToTimetag(d);
  }

  // s is Date
  if ("getTime" in s) {
    return osc.timestampToTimetag(s.getTime() / 1000);
  }

  // Unreachable
  throw new Error(`Bad type for delta seconds: {seconds}`);
}
