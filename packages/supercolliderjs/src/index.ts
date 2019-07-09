/**
 * @module supercolliderjs
 */
import * as server from "@supercollider.js/server";
import * as lang from "@supercollider.js/lang";

import checkInstall from "./checkInstall";

module.exports = {
  server,
  lang,

  map: server.mapping,
  msg: server.msg,
  resolveOptions: server.resolveOptions,
  checkInstall,
  SCLangError: lang.SCLangError,
  // Moved to @supercollider.js/scapi
  // scapi: SCAPI,
};
