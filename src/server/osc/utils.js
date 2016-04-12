
import _ from 'underscore';
import * as osc from 'osc-min';

/**
 * Convert full OSC message to a simple Array

  {address: '/n_go',
    args:
     [ Object { type: 'integer', value: 1000 },
       Object { type: 'integer', value: 0 },
       Object { type: 'integer', value: -1 },
       Object { type: 'integer', value: 3 },
       Object { type: 'integer', value: 0 } ],
    oscType: 'message' }

  to:

    ['/n_go', 1000, 0, -1, 3, 0]
 */
export function parseMessage(msg) {
  if (msg.oscType === 'bundle') {
    return [timetagToDate(msg.timetag)].concat(_.map(msg.elements, parseMessage));
  }
  return [msg.address].concat(_.pluck(msg.args, 'value'));
}


/**
 * Format an object for osc-min message
 */
export function makeMessage(msg) {
  return {
    oscType: 'message',
    address: msg[0],
    args: msg.slice(1)
  };
}

/**
 * Format an object for osc-min bundle
 *
 * @param {null|Number|Array|Date} time -
 *                                 null means now, immediately
 *                                 unix timestamp in seconds
 *                                 [secondsSince1900Jan1, fractionalSeconds]
 *                                 javascript Date object
 * @param {Array} packets - osc messages as [address, arg1, ...argN]
 *                        or bundles as Objects: .timeTag .packets
 */
export function makeBundle(time, packets) {
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
export function asPacket(thing) {
  if (_.isArray(thing)) {
    return makeMessage(thing);
  }
  return makeBundle(thing.timeTag, thing.packets || []);
}


/**
 *
 * timetagToDate(ntpTimeTag)
 *
 * Convert a timetag array to a JavaScript Date object in your local timezone.
 *
 * Received OSC bundles converted with `fromBuffer` will have a timetag array:
 * [secondsSince1970, fractionalSeconds]
 * This utility is useful for logging. Accuracy is reduced to milliseconds,
 * but the returned Date object also has `fractionalSecondsInt` and `fractionalSecondsFloat` set if you need full accuracy (0.00000000023283 second, or 2^32 per second)
 *
 * @param {Array} ntpTimeTag
 * @returns {Date}
 */
export const timetagToDate = osc.timetagToDate;


/**
 *
 * dateToTimetag(date)
 *
 * Convert a JavaScript Date to a NTP timetag array [secondsSince1970, fractionalSeconds].
 *
 * `toBuffer` already accepts Dates for timetags so you might not need this function. If you need to schedule bundles with finer than millisecond accuracy then you could use this to help assemble the NTP array.
 */
export const dateToTimetag = osc.dateToTimetag;


/**
 * deltaTimeTag(secondsFromNow, [now])
 *
 * Make NTP timetag array relative to the current time.
 *
 * @param {Number} seconds
 * @param {Date} now - optional
 */
export function deltaTimeTag(seconds, now) {
  const d = (now || _.now()) / 1000 + (seconds || 0);
  return osc.timestampToTimetag(d);
}
