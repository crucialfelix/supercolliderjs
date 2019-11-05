# @supercollider/dryads

Declarative, live updating components for SuperCollider built on the Dryadic framework.

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

## API

[API](/packages/docs/index.html)