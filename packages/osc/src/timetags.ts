import { NTPTimeTag, OSCTimeType } from "./types";

const UNIX_EPOCH = 0;
const NTP_EPOCH = Date.UTC(1900, 0) / 1000;
const SECONDS_FROM_1900_to_1970 = UNIX_EPOCH - NTP_EPOCH;
// const _SECONDS_FROM_1900_to_1970 = 2208988800;

const MAX_UINT32 = Math.pow(2, 32);

/**
 * Convert a JavaScript Date to a NTP timetag array `[secondsSince1970, fractionalSeconds]`.
 *
 * `toBuffer` already accepts Dates for timetags so you might not need this function.
 * If you need to schedule bundles with sub-millisecond accuracy then you
 * could use this to help assemble the NTP array.
 */
export function dateToTimetag(date: Date): NTPTimeTag {
  return timestampToTimetag(date.getTime() / 1000);
}

/**
 * Unix timestamp to NTP Time Tag
 * @param secs
 */
const timestampToTimetag = (secs: number): NTPTimeTag => {
  const totalSecs = SECONDS_FROM_1900_to_1970 + secs;
  const wholeSecs = Math.trunc(totalSecs);
  const fracSeconds = totalSecs - wholeSecs;
  const tt = makeTimetag(wholeSecs, fracSeconds);
  return tt;
};

function makeTimetag(wholeSeconds: number, fracSeconds: number): NTPTimeTag {
  return [wholeSeconds, Math.round(MAX_UINT32 * fracSeconds)];
}

export function timetagToDate(timetag: NTPTimeTag): Date {
  const seconds = timetag[0] - UNIX_EPOCH;

  const fracs = ntpToFractionalSeconds(timetag[1]);
  const date = new Date();
  date.setTime(seconds * 1000 + fracs * 1000);

  const dd = new Date();
  dd.setUTCFullYear(date.getUTCFullYear());
  dd.setUTCMonth(date.getUTCMonth());
  dd.setUTCDate(date.getUTCDate());
  dd.setUTCHours(date.getUTCHours());
  dd.setUTCMinutes(date.getUTCMinutes());
  dd.setUTCSeconds(date.getUTCSeconds());
  dd.setUTCMilliseconds(fracs * 1000);
  return dd;
}

/**
 * Make NTP timetag array relative to the current time.
 *
 * @param seconds  - seconds relative to now
 * @param now      - JavaScript timestamp in milliseconds
 * @return `[ntpSecs, ntpFracs]`
 */
export function deltaTimeTag(seconds: number, now?: number | Date): NTPTimeTag {
  let milliseconds: number;
  if (now) {
    milliseconds = typeof now === "number" ? now : now.getTime();
  } else {
    milliseconds = new Date().getTime();
  }

  const delta = milliseconds / 1000 + seconds;
  return timestampToTimetag(delta);
}

function ntpToFractionalSeconds(fracSeconds: number): number {
  return fracSeconds / MAX_UINT32;
}

export function asNTPTimeTag(time: OSCTimeType): NTPTimeTag {
  let tt: NTPTimeTag;
  if (typeof time === "number") {
    tt = timestampToTimetag(time);
  } else if (Array.isArray(time) && time.length === 2) {
    tt = time;
  } else if (time instanceof Date) {
    tt = dateToTimetag(time);
  } else if (!time) {
    tt = dateToTimetag(new Date());
  } else {
    throw new Error("Invalid timetag: " + time);
  }
  return tt;
}
