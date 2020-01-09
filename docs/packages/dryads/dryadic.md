# dryadic
Package: <a href="#/packages/dryads/api">@supercollider/dryads</a>

<div class="entity-box"><h4 id="dryadic"><span class="token function">dryadic</span>(<span class="nowrap">rootDryad: <span class="type reference">Dryad</span></span>, <span class="nowrap">moreLayers: <span class="type ">[object Object]</span>[] =  []</span>, <span class="nowrap">rootContext: <span class="type reference">Context</span> =  {}</span>): <span class="type reference">DryadPlayer</span></h4><p class="short-text">Create a DryadPlayer from a Dryad or hyperscript definition.</p><p class="">Automatically includes the supercollider.js layer

usage:
```js
  var sc = require('supercolliderjs');
  var player = sc.dryadic([
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
  player.play();
  // ...
  player.stop();
```
</p></div>
