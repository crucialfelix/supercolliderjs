/**
 * @module supercolliderjs
 */
import * as server from './server';
import * as lang from './lang';
import * as map from './map';
import * as msg from './server/osc/msg';
import resolveOptions from './utils/resolveOptions';
import checkInstall from './utils/checkInstall';
import { SCError, SCLangError } from './Errors';
import SCAPI from './scapi';

module.exports = {
  server,
  lang,
  map,
  msg,
  resolveOptions,
  checkInstall,
  SCError,
  SCLangError,
  scapi: SCAPI,
  // @deprecated These were renamed
  sclang: lang,
  scsynth: server
};
