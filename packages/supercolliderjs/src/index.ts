/**
 * @module supercolliderjs
 */
import * as langLib from "@supercollider.js/lang";
import * as serverLib from "@supercollider.js/server";
import ServerPlus, { boot } from "@supercollider.js/server-plus";
import * as dryadsLib from "@supercollider.js/dryads";

export { SCLangError } from "@supercollider.js/lang";
export const lang = langLib;
export const dryads = dryadsLib;
export { mapping as map, msg, resolveOptions } from "@supercollider.js/server";
export const server = {
  ...serverLib,
  boot,
  server: ServerPlus,
};
