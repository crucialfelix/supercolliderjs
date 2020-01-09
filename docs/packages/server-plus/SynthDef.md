# SynthDef
Package: <a href="#/packages/server-plus/api">@supercollider/server-plus</a>

<div class="entity-box"><div class="Class"><h3 class="class-header" id="SynthDef"><span class="token keyword">class</span> <span class="class">SynthDef</span></h3><p class="short-text">scsynth SynthDef</p><p class="">See `server.synthDefs(...)`

These are currently compiled using sclang,
and the synthDefResult holds metadata about the compiled
synthdef and the raw compiled bytes.

The SynthDef may have been compiled from a sourceCode string
or compiled from a file at path.
</p><div class="section-heading">Constructor</div><div class="class-member"><h4 id="constructor"><span class="token function">new SynthDef</span>(<span class="nowrap">server: <span class="type reference">ServerPlus</span></span>, <span class="nowrap">defName: <span class="type token entity">string</span></span>, <span class="nowrap">synthDefResult: <span class="type reference">SynthDefResultType</span></span>, <span class="nowrap">sourceCode: <span class="type "><span class="type token entity">undefined</span> | <span class="type token entity">string</span></span></span>, <span class="nowrap">path: <span class="type "><span class="type token entity">undefined</span> | <span class="type token entity">string</span></span></span>): <span class="type reference">SynthDef</span></h4></div><div class="section-heading">Property</div><div class="class-member"><h4 id="name"><span class="token property">name</span> <span class="type token entity">string</span></h4></div><div class="class-member"><h4 id="path"><span class="token property">path</span> <span class="type "><span class="type token entity">undefined</span> | <span class="type token entity">string</span></span></h4></div><div class="class-member"><h4 id="server"><span class="token property">server</span> <span class="type reference">ServerPlus</span></h4></div><div class="class-member"><h4 id="sourceCode"><span class="token property">sourceCode</span> <span class="type "><span class="type token entity">undefined</span> | <span class="type token entity">string</span></span></h4></div><div class="class-member"><h4 id="synthDefResult"><span class="token property">synthDefResult</span> <span class="type reference">SynthDefResultType</span></h4></div></div></div>
