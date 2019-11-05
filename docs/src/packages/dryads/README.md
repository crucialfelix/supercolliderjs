{{> header }}


(More docs coming)



## Usage

```js
const d = require("@supercollider/dryads");

let s = d.Synth({
  def: d.SynthDef(``);
}, {
  freq: 440
});

s.play();
```

{{> footer }}