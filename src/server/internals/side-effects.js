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
  return context.server.send.msg(msg);
}
/**
 * @private
 */
export function nextNodeID(context) {
  return context.server.nextNodeID();
}
