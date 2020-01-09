# @supercollider/dryads
[![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

<i>Dryadic components for SuperCollider</i>

> A dryad (/ˈdraɪ.æd/; Greek: Δρυάδες, sing.: Δρυάς) is a tree nymph, or female tree spirit, in Greek mythology

Dryadic is a framework for writing components that encapsulate all the complexities of loading, state management, dependencies and execution order.

https://github.com/crucialfelix/dryadic

Just as SuperCollider synths have a call graph or UGens, Dryadic has a call graph of higher level components. In Dryadic this is referred to as a tree.

Dryadic is declarative: you specify the resources you want and how they are connected. The framework does the rest.
Because it is declarative, you can update your tree while performing and the resources (servers, sounds, synth defs, settings) update live.

## Examples

More extensive examples will come with dryadic 1.0

```js
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

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/dryads-synth-event-list.js>source</a></small>


Documentation
-------------

[Documentation](https://crucialfelix.github.io/supercolliderjs/#/packages/dryads/api)

Compatibility
-------------

Works on Node 10+

Source code is written in TypeScript and is usable in JavaScript [es2018](https://2ality.com/2017/02/ecmascript-2018.html) or [TypeScript](https://www.typescriptlang.org/docs/home.html) projects.

Contribute
----------

- Issue Tracker: https://github.com/crucialfelix/supercolliderjs/issues
- Source Code: https://github.com/crucialfelix/supercolliderjs

License
-------

MIT license

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE

[npm-url]: https://npmjs.org/package/@supercollider/dryads
[npm-version-image]: http://img.shields.io/npm/v/@supercollider/dryads.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/@supercollider/dryads.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
