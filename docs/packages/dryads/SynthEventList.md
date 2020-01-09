# SynthEventList
Package: <a href="#/packages/dryads/api">@supercollider/dryads</a>

<div class="entity-box"><div class="Class"><h3 class="class-header" id="SynthEventList"><span class="token keyword">class</span> <span class="class">SynthEventList</span></h3><span class="token keyword">extends</span> <span class="type reference">Dryad&lt;<span class="type reference">Properties</span>&gt;</span><p class="short-text">Takes a list of synth event objects with relative times and schedules them.</p><p class="">#### properties

__events:__ Array

The event values should be simple JavaScript objects:

    {
      defName: 'synthDefName',
      args: {
        out: 0,
        freq: 440
      },
      time: 0.3
    }

 Where time is seconds relative to the epoch. The epoch is the start time of
 the dryadic tree, unless a parent Dryad has set a new epoch into context.

   epoch: number|Date|undefined
     Optional epoch that the event times in the list are relative to.
     Can also be updated by the updateStream
     default: context.epoch or now

__updateStream:__ Bacon stream to push updated event lists of the form:

     {
       events: [{time: msgs: []}...],
       epoch: 123456789
     }

    .events Array
    .epoch  number|Date

Deprecated: will be replaced with live updating and setting of
Any value in a dryadic document from the player or remote client.

Pushing a new event list cancels previous events and schedules new events.

Note that by default the epoch will be unchanged: relative times
are still relative to when the Dryad tree started playing or when any parent
Dryad set an epoch in context. This means you update the currently playing score
but it doesn't restart from the beginning, it keeps playing.

Optionally you may push an .epoch with the updateStream. This can be a date or timestamp
slightly in the future. If you pass "now" then any events at `0.0` will be too late to play.

__defaultParams:__ a fixed object into which the event value is merged.

__loopTime:__ Play the events continuously in a loop.
</p><div class="section-heading">Constructor</div><div class="class-member"></div><div class="section-heading">Property</div><div class="class-member"><h4 id="children"><span class="token property">children</span> <span class="type ">[object Object]</span>[]</h4></div><div class="class-member"><h4 id="properties"><span class="token property">properties</span> <span class="type reference">Properties</span></h4></div><div class="section-heading">Accessor</div><div class="class-member"><h4 id="isDryad"><span class="token property">isDryad</span> <span class="type token entity">boolean</span></h4><p class="short-text">This method is never actually called, but merely because its implemented
(dryad.isDryad is not undefined) it marks the things as being a Dryad.</p></div><div class="section-heading">Method</div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="add"><span class="token function">add</span>(<span class="nowrap">player: <span class="type reference">DryadPlayer</span></span>): <span class="type reference">AddCommand</span></h4></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="defaultProperties"><span class="token function">defaultProperties</span>(): <span class="type reference">Properties</span></h4></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="remove"><span class="token function">remove</span>(): <span class="type reference">Command</span></h4></div><div class="class-member"></div><div class="class-member"><h4 id="subgraph"><span class="token function">subgraph</span>(): <span class="type reference">Dryad</span></h4><div class="">Returns Wraps itself in a Group so all child Synth events will be removed on removal of the Group.</div></div><div class="class-member"></div><div class="class-member"></div></div></div>
