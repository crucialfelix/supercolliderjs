/**
 * OSC
 */
export type OscType = string | number | Buffer | CompletionMsg | boolean | null;
/**
 * Some scsynth messages accept another OSC message as the last argument,
 * and will execute that message after the first message is completed.
 */
type CompletionMsgItem = string | number | Buffer | null;
export type CompletionMsg = [string, ...CompletionMsgItem[]];

/**
 * An array of values of OscType
 */
export type OscValues = OscType[];

/**
 * NTP / OSC time tag
 * [secondsSince1900, fractionalSeconds]
 */
export type NTPTimeTag = [number, number];

/**
 * OSCTimeType
 *
 * Many scheduling functions take various ways of specifying time,
 * which are then converted to an NTPTimeTag.
 *
 *  - null: now, immediately
 *  - number: unix timestamp in seconds
 *  - Array: `[secondsSince1900Jan1, fractionalSeconds]` Most precise
 *  - Date
 */
export type OSCTimeType = NTPTimeTag | null | number | Date;

/**
 *  An OSC message is [address, val, val, val...]
 */
export type MsgType = [string, ...OscValues];

/**
 * An OSC bundle has a timetag and contains messages or bundles
 * that should be executed at that scheduled time.
 */
export interface OSCBundle {
  timetag: OSCTimeType;
  elements: (OSCMessage | OSCBundle)[];
  oscType?: string;
}

export interface OSCMessage {
  address: string;
  args: OscType[];
  oscType?: string;
}

export type BundleOrMessage = OSCBundle | OSCMessage;
