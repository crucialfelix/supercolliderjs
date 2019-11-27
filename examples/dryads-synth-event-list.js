/**
 * This example generates a random sequence and plays the first
 * 4 seconds in a loop.
 *
 * SynthEventList has other tricks not yet shown here yet.
 * You can reschedule or alter the event list while playing.
 *
 * The scheduler can be given different scheduling functions,
 * one of which is this sequential event list.
 *
 * Other versions could use tempo, mathematical formula,
 * non-deterministic, event-by-event scheduling.
 */
const { play, SCSynthDef, SynthEventList, SCServer } = require("supercolliderjs").dryads;

function randomEvent(totalDuration) {
  return {
    time: Math.random() * totalDuration,
    defName: "saw",
    args: {
      freq: Math.random() * 500 + 100,
    },
  };
}

function randomEvents(totalDuration = 60, density = 2) {
  const n = Math.floor(totalDuration * density);
  const events = [];
  for (let index = 0; index < n; index++) {
    events.push(randomEvent(totalDuration));
  }
  return events;
}

// Currently this has to be expressed as a tree of nested dependencies.
// dryadic 2 will make it much cleaner and simpler.
const out = new SCServer({ numInputBusChannels: 0 }, [
  new SCSynthDef(
    {
      source: `
    SynthDef("saw", { arg freq;
      Out.ar(0, EnvGen.kr(Env.perc, doneAction: 2) * Saw.ar(freq))
    });
  `,
    },
    [
      new SynthEventList({
        events: randomEvents(60, 4),
        loopTime: 65,
      }),
    ],
  ),
]);

play(out);
