import * as _  from 'underscore';
import { deltaTimeTag } from '../../server/osc/utils';

/**
 * Just in time osc scheduler used by scserver middleware
 * to send OSC messages.
 */
export default class OSCSched {

  /**
   * constructor -
   *
   * @param  {Function} sendFn                   function that sends OSC bundles (time, packets)
   * @param  {integer} epoch                     timestamp of epoch that all times are relative to
   * @param  {float} latency=0.05                just-in-time latency in seconds
   * @param  {Function} setTimeoutFn=setTimeout  javascript setTimeout (for mocking tests)
   * @param  {Function} clearTimeoutFn=clearTimeout javascript setInterval (for mocking tests)
   * @return {void}
   */
  constructor(sendFn, epoch, latency=0.05, setTimeoutFn=setTimeout, clearTimeoutFn=clearTimeout) {
    this.sendFn = sendFn;
    this.epoch = epoch; // required
    this.next = null;
    this.bundles = [];
    this.latency = latency;
    this.setTimeout = setTimeoutFn;
    this.clearTimeout = clearTimeoutFn;
  }


  /**
   * sched - schedule OSC bundles, cancelling any scheduled from previous calls
   *
   * @param  {Array} bundles    Array of {time: float, packets: [oscMessages]}
   *                            Times are in seconds relative to the epoch
   * @return {void}
   */
  sched(bundles) {
    this.bundles = bundles;
    this._schedNext();
  }

  _schedNext(startingAt=0) {
    if (this.next) {
      this.clearTimeout(this.next);
      this.next = null;
    }

    // find first bundle with positive delta
    let now = _.now();
    let relativeNow = now - this.epoch;
    for (let i = startingAt; i < this.bundles.length; i += 1) {
      let e = this.bundles[i];
      let delta = (e.time * 1000) - relativeNow;
      if (delta >= 0) {
        if (delta <= (this.latency * 1000)) {
          // send immediately and step
          this._send(e);
          this._schedNext(i + 1);
        } else {
          this._jitToNext(delta - this.latency, e, i);
        }

        return;
      }
    }
  }

  _jitToNext(delta, event, i) {
    this.next = this.setTimeout(() => {
      this.next = null;
      this._send(event);
      this._schedNext(i + 1);
    }, delta);
  }

  _send(event) {
    this.sendFn(deltaTimeTag(event.time, this.epoch), event.packets);
  }
}
