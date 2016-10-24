
export type JSONType = | string | number | boolean | null | JSONObjectType | JSONArrayType;
export type JSONObjectType = { [key:string]: JSONType };
export type JSONArrayType = Array<JSONType>;

export type SclangResultType = JSONType;

export type OscType = string|number|Buffer|null;
export type MsgType = [OscType];
export type CallAndResponseType = {call:MsgType, response:MsgType};
export type PairsType = Array<MsgType>|Object;
export type OSCTimeType = null|number|[number]|Date;
export type OSCMinMsgType = {oscType: string, address: string, args: MsgType};

export type NodeStateType = {
  parent:?number,
  previous:?number,
  next:?number,
  isGroup:boolean,
  head:?number,
  tail:?number
};
