
import {EventEmitter} from 'events';
import {Observable} from 'Rx';


export default class SendOSC extends EventEmitter {

  msg(m) {
    this.emit('msg', m);
  }

  bundle(b) {
    throw new Error('Not yet implemented');
    // not yet implemented
    // this will need a time
    // this.emit('bundle', b);
  }

  /**
   * Subscribe to monitor messages and bundles sent.
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
