
export type JSONType = | string | number | boolean | null | JSONObjectType | JSONArrayType;
export type JSONObjectType = { [key:string]: JSONType };
export type JSONArrayType = Array<JSONType>;

// @typedef
export type SclangResultType = JSONType;

export type SynthDefResultType = {name:string, bytes:Buffer, synthDesc:JSONObjectType};
export type SynthDefResultMapType = {[defName:string] : SynthDefResultType};

// @typedef
export type OscType = string|number|Buffer|null;
// @typedef
export type MsgType = [OscType];
// @typedef
export type CallAndResponseType = {call:MsgType, response:MsgType};
// @typedef
export type PairsType = Array<MsgType>|Object;
  // @typedef
export type OSCTimeType = null|number|[number]|Date;
// @typedef
export type OSCMinMsgType = {oscType: string, address: string, args: MsgType};

// @typedef
export type NodeStateType = {
  parent:?number,
  previous:?number,
  next:?number,
  isGroup:boolean,
  head:?number,
  tail:?number
};
