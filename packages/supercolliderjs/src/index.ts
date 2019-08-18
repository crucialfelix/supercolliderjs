/**
 * @module supercolliderjs
 */
import * as lang from "@supercollider.js/lang";
import * as server from "@supercollider.js/server";
import ServerPlus from "@supercollider.js/server-plus";


module.exports = {
  server: {
    ...server,
    Server: ServerPlus
  },
  lang,

  map: server.mapping,
  msg: server.msg,
  resolveOptions: server.resolveOptions,
  SCLangError: lang.SCLangError,
  // Moved to @supercollider.js/scapi
  // scapi: SCAPI,
};
