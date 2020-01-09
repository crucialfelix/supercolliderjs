/**
 * @module supercolliderjs
 */
import * as langLib from "@supercollider/lang";
import * as server from "@supercollider/server";
import ServerPlus, { boot } from "@supercollider/server-plus";
import * as dryads from "@supercollider/dryads";
import { SCLangError } from "@supercollider/lang";
import { mapping as map, msg, resolveOptions } from "@supercollider/server";

const lang = langLib;

module.exports = {
  server: {
    ...server,
    boot,
    server: ServerPlus,
  },
  dryads,
  lang,
  map,
  msg,
  // why is this exported separately?
  SCLangError,
  // @deprecated
  resolveOptions,
};
