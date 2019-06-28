// export type JSONType =
//   | string
//   | number
//   | boolean
//   | null
//   | JSONObjectType
//   | JSONArrayType;
// export type JSONObjectType = { [key: string]: JSONType };
// export type JSONArrayType = Array<string | number | boolean | Date | JSONType>;

export type JSONType = string | number | boolean | Date | null | JSONObjectType;

export interface JSONObjectType {
  [x: string]: JSONType | JSONType[];
}

// interface JsonArray extends Array<string|number|boolean|Date|Json|JsonArray> { }

export type SclangResultType = JSONType;

export interface SynthDefResultType {
  name: string;
  bytes: Buffer;
  synthDesc: JSONObjectType;
  // sourceCode
}
export interface SynthDefResultMapType {
  [defName: string]: SynthDefResultType;
}

interface SynthDefCompileRequestWithSource {
  source: string;
}
interface SynthDefCompileRequestWithPath {
  path: string;
}
export type SynthDefCompileRequest = SynthDefCompileRequestWithSource | SynthDefCompileRequestWithPath;

/**
 * OSC
 */
export type OscType = string | number | Buffer | CompletionMsg | null;
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
 * OSCTimeType
 *
 *  - null: now, immediately
 *  - number: unix timestamp in seconds
 *  - Array: `[secondsSince1900Jan1, fractionalSeconds]` Most precise
 *  - Date
 */
export type OSCTimeType = null | number | [number, number] | Date;

/**
 *  An OSC message is [address, val, val, val...]
 */
export type MsgType = [string, ...OscValues];

/**
 * An OSC bundle has a timetag and contains messages or bundles
 * that should be executed at that scheduled time.
 */
export interface BundleType {
  timetag: OSCTimeType;
  packets: MsgType[] | BundleType[];
}

/**
 * Call and response is where an OSC command is sent to the
 * server which later responds with a message matching 'response'.
 */
export interface CallAndResponse {
  call: MsgType;
  response: MsgType;
}

export interface NodeStateType {
  parent?: number;
  previous?: number;
  next?: number;
  isGroup: boolean;
  head?: number;
  tail?: number;
}
