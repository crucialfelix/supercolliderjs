import {boot as _bootServer} from '../server';
import {boot as _bootLang} from '../../lang/sclang';

/**
 * @private
 */
export function bootServer(options) {
  return _bootServer(options);
}
/**
 * @private
 */
export function bootLang(options) {
  return _bootLang(options);
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
/**
 * @private
 */
export function interpret(context, code) {
  return context.lang.interpret(code, undefined, false, false, true);
}
