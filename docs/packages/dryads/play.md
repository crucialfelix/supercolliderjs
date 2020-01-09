# play
Package: <a href="#/packages/dryads/api">@supercollider/dryads</a>

<div class="entity-box"><h4 id="play"><span class="token function">play</span>(<span class="nowrap">rootDryad: <span class="type reference">Dryad</span></span>): <span class="type reference">Promise&lt;<span class="type reference">DryadPlayer</span>&gt;</span></h4><p class="short-text">Play a Dryad or hyperscript document.</p><p class="">usage:

```js
  var sc = require('supercolliderjs');
  var player = sc.play([
    'scserver', [
      ['group', [
        ['synth', {
          defName: 'sinosc',
          args: {
            freq: 440
          }
        }]
      ]
  ]);
```</p></div>
