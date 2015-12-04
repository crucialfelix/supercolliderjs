
import {EventEmitter} from 'events';
import {Observable} from 'rx';

/**
 * Owned by the Server, this is an object that you call .msg or .bundle on
 * to send OSC.
 *
 * The Server subscribes to this and does the actual sending.
 * You may also subscribe to this for debugging, logging or entertainment purposes.
 */
export default class SendOSC extends EventEmitter {

  msg(m) {
    this.emit('msg', m);
  }

  bundle(/*b*/) {
    throw new Error('Not yet implemented');
    // not yet implemented
    // this will need a time
    // this.emit('bundle', b);
  }

  /**
   * Subscribe to monitor OSC messages and bundles sent.
   *
   * Events are: {type: msg|bundle: payload: Array}
   *
   * @returns {Rx.Disposable} - `thing.dispose();` to unsubscribe
   */
  subscribe(onNext, onError, onComplete) {
    var msgs = Observable.fromEvent(this, 'msg', (msg) => {
      return {type: 'msg', payload: msg};
    });
    var bundles = Observable.fromEvent(this, 'bundle', (msg) => {
      return {type: 'bundle', payload: msg};
    });
    var combo = msgs.merge(bundles);
    return combo.subscribe(onNext, onError, onComplete);
  }
}
