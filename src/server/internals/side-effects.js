import {boot as _bootServer} from '../server';
import {boot as _bootLang} from '../../lang/sclang';

/**
 * @private
 */
export function bootServer() {
  return _bootServer();
}
/**
 * @private
 */
export function bootLang() {
  return _bootLang();
}
/**
 * @private
 */
export function sendMsg(context, msg) {
  var [command, ...args] = msg;
  return context.server.sendMsg(command, args);
}
/**
 * @private
 */
export function nextNodeID(context) {
  return context.server.nextNodeID();
}
