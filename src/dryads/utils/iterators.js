/**
 * @flow
 * @module iterators
 * @ temp off - memberof dryads
 */
import _ from 'lodash';

export function sortEvents(events: Array<Object>) {
  return events.sort((a, b) => a.time - b.time);
}

export function clipTime(events: Array<Object>, start: number, end: number) {
  return events.filter(e => e.time >= start && e.time <= end);
}

/**
 * eventListIterator - Creates a function for use in a getNextEvent iterator that returns events sequentially
 *
 * @param  {Array} events Events are objects with .time attribute.
 * @return {Function}      arguments:
 *                          {number} now - in seconds,
 *                          {Object} memo - used internally
 *                          If memo is not supplied then it will search for the next event
 *                          greater than or equal to 'now'
 *                          and if memo IS supplied then it iterates over the sorted event list.
 *                         returns {Object} event - Which has .event (the original event) and .memo which is
 *                              used by OSCSched the next time this function is called.
 */
export function eventListIterator(events: Array<Object>): Function {
  const sorted = sortEvents(events);
  const length = sorted.length;

  return (now: number, memo: ?Object): ?Object => {
    if (length === 0) {
      return;
    }

    if (memo) {
      // memo, get next event
      let event = sorted[memo.i];
      if (event) {
        return {
          event,
          memo: { i: memo.i + 1 }
        };
      }
    } else {
      // search for first positive delta
      for (let i = 0; i < length; i += 1) {
        let event = sorted[i];
        let delta = event.time - now;
        if (delta >= 0) {
          return {
            event,
            memo: { i: i + 1 }
          };
        }
      }
    }
  };
}

/**
 * loopedEventListIterator - Creates a function for use in a getNextEvent iterator that loops over an event list
 *
 * @param  {Array} events   Events are objects with .time attribute.
 * @param  {number} loopTime The iterator will loop from 0 .. loopTime. Events past the loop are ignored (never played).
 * @return {Function}      arguments:
 *
 *   {number} now - in seconds,
 *   {Object} memo - used internally
 *   If memo is not supplied then it will search for the next event
 *   greater than or equal to 'now'
 *   and if memo *is* supplied then it iterates over the sorted event list.
 *
 *   returns {Object} item - Which has .event (the original event) and .memo which is
 *                              used by OSCSched the next time this function is called.
 */
export function loopedEventListIterator(
  events: Array<Object>,
  loopTime: number
): Function {
  const sorted = clipTime(sortEvents(events), 0, loopTime);
  const length = sorted.length;

  return (now: number, memo: ?Object): ?Object => {
    if (length === 0) {
      return;
    }

    if (memo) {
      let event = sorted[memo.i % length];
      let iteration = Math.floor(memo.i / length);
      let timeBase = iteration * loopTime;

      if (event) {
        // if (now > timeBase + event.time) {
        //   throw new Error('loopedEventListIterator and event is in the past');
        // }

        return {
          event: _.assign({}, event, { time: timeBase + event.time }),
          memo: { i: memo.i + 1 }
        };
      }
    } else {
      // search for first positive delta
      let iteration = Math.max(Math.floor(now / loopTime), 0);

      let timeBase = iteration * loopTime;
      let lastEventTime = sorted[length - 1].time;
      if (now > timeBase + lastEventTime && now < timeBase + loopTime) {
        // play position is between lastEvent and loopTime
        // so start search in next loop, not at start of current one
        timeBase = timeBase + loopTime;
      }

      for (let i = 0; i < length; i += 1) {
        let event = sorted[i];
        let time = timeBase + event.time;
        let delta = time - now;

        if (delta >= 0) {
          return {
            event: _.assign({}, event, { time }),
            memo: { i: iteration * length + i + 1 }
          };
        }
      }
    }
  };
}
