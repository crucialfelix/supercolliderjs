import * as _  from 'underscore';
import { deltaTimeTag } from '../../server/osc/utils';

/**
 * Just in time osc scheduler used by scserver middleware
 * to send OSC messages.
 *
 * This is used by the scserver middleware.
 *
 * It is used by calling `.schedLoop(getNext, epoch)`
 */
export default class OSCSched {

  /**
   * constructor -
   *
   * @param  {Function} sendFn                   Function that sends OSC bundles to the server.
   *                                             args: (time, msgs)
   * @param  {number} latency=0.05               Just-in-time latency in seconds.
   *                                             Bundles are schedule in the javascript process
   *                                             and sent to the server just before the event time.
   * @param  {Function} setTimeoutFn=setTimeout  JavaScript setTimeout (injectable for mocking tests)
   * @param  {Function} clearTimeoutFn=clearTimeout JavaScript setInterval (injectable for mocking tests)
   */
  constructor(sendFn, latency=0.05, setTimeoutFn=setTimeout, clearTimeoutFn=clearTimeout) {
    this.sendFn = sendFn;
    this.latency = latency;
    this.setTimeout = setTimeoutFn;
    this.clearTimeout = clearTimeoutFn;

    this.getNextFn = undefined;
    this.epoch = undefined;
    this.timerId = undefined;
  }

  /**
   * schedLoop - start a loop that gets the next event and schedules it to be sent
   *
   * @param  {Function} getNextFn A function that returns the next event object to send.
   *
   *                              Args: now, memo
   *
   *                              Returns an object:
   *
   *                              {time: secondsSinceEpoch, msgs: [], memo: {}}
   *
   *                              If it does not return anything (void) then the loop will end.
   *
   *                              memo is an object that the loop function can store
   *                              state in. eg. list index for an iterator
   *
   *                              msgs may be an array of osc messages or a function
   *                              called at send time that will return an array of osc messages.
   *
   * @param  {float} epoch     Javascript timestamp (milliseconds since 1970 UTC)
   */
  schedLoop(getNextFn, epoch) {
    this.getNextFn = getNextFn;
    if (epoch) {
      this.epoch = epoch;
    }

    if (!this.epoch) {
      throw new Error(`Epoch not set: ${this.epoch}`);
    }

    this._schedNext();
  }

  _schedNext(memo) {
    if (this.timerId) {
      this.clearTimeout(this.timerId);
      this.timerId = undefined;
    }

    const now = (_.now() - this.epoch) / 1000;
    const event = memo ? this.getNextFn(now, memo) : this.getNextFn(now);
    if (event) {
      const delta = event.time - now;
      if (delta <= this.latency) {
        this._send(event);
        this._schedNext(event.memo);
      } else {
        this._jitSend(delta, event);
      }
    }
  }

  /**
   * _jitSend - schedule to send the event just before it should play on the server.
   *
   * Cancels any previously scheduled event.
   *
   * @param  {float} delta seconds to wait
   * @param  {Object} event With .msgs .time and optional .memo
   *                        to be passed to the next call to getNextFn
   */
  _jitSend(delta, event) {
    this.timerId = this.setTimeout(() => {
      this.timerId = null;
      this._send(event);
      this._schedNext(event.memo);
    }, (delta - this.latency) * 1000);
  }

  /**
   * _send - send the OSC bundle
   *
   * @param  {Object} event
   */
  _send(event) {
    this.sendFn(deltaTimeTag(event.time, this.epoch), event.msgs);
  }
}
