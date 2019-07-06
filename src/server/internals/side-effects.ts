import { boot as _bootServer } from '../server';
import { boot as _bootLang } from '../../lang/sclang';

/**
 * @private
 */
export function bootServer(options, store) {
  return _bootServer(options, store);
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
  return context.server.state.nextNodeID();
}
/**
 * @private
 */
export function interpret(context, code) {
  return context.lang.interpret(code, undefined, false, false, true);
}
