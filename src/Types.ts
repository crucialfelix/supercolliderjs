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

export type OscType = string | number | Buffer | null;

// the first item must be a string
export type MsgType = OscType[];

export interface BundleType extends MsgType {}

export interface CallAndResponseType {
  call: MsgType;
  response: MsgType;
}

export type PairsType = MsgType[] | object;

export type OSCTimeType = null | number | [number, number] | Date;

// from osc-min library
export interface OSCMinMsgType {
  oscType: "message" | "bundle";
  address: string;
  // I think it's array of { type: value: }
  args: MsgType;
  // bundles may also have
  timetag?: OSCTimeType;
  elements?: OSCMinMsgType[];
}

export interface NodeStateType {
  parent?: number;
  previous?: number;
  next?: number;
  isGroup: boolean;
  head?: number;
  tail?: number;
}
