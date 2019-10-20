/**
 * @module supercolliderjs
 */
import * as langLib from "@supercollider/lang";
import * as serverLib from "@supercollider/server";
import ServerPlus, { boot } from "@supercollider/server-plus";
import * as dryadsLib from "@supercollider/dryads";

export { SCLangError } from "@supercollider/lang";
export const lang = langLib;
export const dryads = dryadsLib;
export { mapping as map, msg, resolveOptions } from "@supercollider/server";
export const server = {
  ...serverLib,
  boot,
  server: ServerPlus,
};
