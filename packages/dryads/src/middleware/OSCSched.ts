import { deltaTimeTag, MsgType } from "@supercollider/server";
import { now as _now } from "lodash";

import { Event } from "../utils/iterators";

export interface OSCEvent extends Event {
  msgs: MsgType[];
}

interface Memo {
  i: number;
}

interface Next {
  event: OSCEvent;
  memo: Memo;
}
type GetNextFn = (now: number, memo: Memo) => Next | undefined;
/**
 * Just in time osc scheduler used by scserver middleware
 * to send OSC messages.
 *
 * This is used by the scserver middleware.
 *
 * It is used by calling `.schedLoop(getNext, epoch)`
 */
export default class OSCSched {
  sendFn: Function;
  latency: number;
  setTimeout: Function;
  clearTimeout: Function;
  getNextFn: GetNextFn;
  epoch: number;
  timerId?: number;

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
  constructor(
    sendFn: Function,
    latency = 0.05,
    setTimeoutFn: Function = setTimeout,
    clearTimeoutFn: Function = clearTimeout,
  ) {
    this.sendFn = sendFn;
    this.latency = latency;
    this.setTimeout = setTimeoutFn;
    this.clearTimeout = clearTimeoutFn;

    this.getNextFn = (now, memo) => undefined;
    this.epoch = _now();
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
  schedLoop(getNextFn: GetNextFn, epoch?: number) {
    this.getNextFn = getNextFn;
    if (!this.getNextFn) {
      throw new Error("getNextFn is null");
    }

    if (epoch) {
      this.epoch = epoch;
    } else {
      throw new Error(`Epoch not set: ${this.epoch}`);
    }

    this._schedNext();
  }

  _schedNext(memo?: Memo, logicalNow?: number) {
    if (this.timerId) {
      this.clearTimeout(this.timerId);
      this.timerId = undefined;
    }

    const now = (_now() - this.epoch) / 1000;
    if (!logicalNow) {
      logicalNow = now;
    }

    const next = this.getNextFn(logicalNow, memo || { i: 0 });
    console.log({ now, logicalNow, next, epoch: this.epoch, _now: _now(), sub: _now() - this.epoch });

    if (typeof next !== "undefined") {
      const delta = next.event.time - now;
      if (delta <= this.latency) {
        if (delta > 0) {
          this._send(next.event);
        } else {
          /* eslint no-console: 0 */
          // TODO: throw EventPastDue and catch that, log it with context.log
          console.warn("Event is past due. Skipping.", JSON.stringify({ delta, now, event: next.event }));
        }

        // this steps by logical time
        this._schedNext(next.memo, next.event.time);
      } else {
        // TODO but there is no next!?
        this._jitSend(now, delta, next);
      }
    }
  }

  /**
   * _jitSend - schedule to send the event just before it should play on the server.
   *
   * Cancels any previously scheduled event.
   *
   * @param  {float} delta seconds to wait
   * @param  {object} event With .msgs .time and optional .memo
   *                        to be passed to the next call to getNextFn
   */
  _jitSend(now: number, delta: number, next: Next) {
    this.timerId = this.setTimeout(() => {
      this.timerId = undefined;
      this._send(next.event);
      this._schedNext(next.memo, next.event.time);
    }, (delta - this.latency) * 1000);
  }

  /**
   * _send - send the OSC bundle
   *
   * @param  {object} event
   */
  _send(event: OSCEvent) {
    this.sendFn(deltaTimeTag(event.time, this.epoch), event.msgs);
  }
}
