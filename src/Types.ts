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
export type OscType = string | number | Buffer | null;

/**
 * OSCTimeType
 *
 *  - null: now, immediately
 *  - number: unix timestamp in seconds
 *  - Array: `[secondsSince1900Jan1, fractionalSeconds]` Most precise
 *  - Date
 */
export type OSCTimeType = null | number | [number, number] | Date;

export type MsgType = [string, ...OscType[]];
export interface BundleType {
  timetag: OSCTimeType;
  packets: MsgType[] | BundleType[];
}

export type PairsType = MsgType[] | object;

export interface CallAndResponseType {
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
