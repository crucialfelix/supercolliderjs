/**
 * JSON
 */
export type JSONType = string | number | boolean | Date | null | JSONObjectType;

export interface JSONObjectType {
  [x: string]: JSONType | JSONType[];
}

// Exporting to avoid changing the API
export { OscType, CompletionMsg, OscValues, OSCTimeType, MsgType } from "@supercollider/osc";
