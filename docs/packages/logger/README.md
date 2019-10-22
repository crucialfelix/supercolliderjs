# @supercollider/logger

Console logging utility for supercollider.js with colors and special formatting for OSC messages.

This is used internally.

## Usage

```js
import Logger from "@supercollider/logger";

let log = new Logger();
// Log an error.
log.err("Oh no!");
// Log debugging information but only if this.debug is true
log.dbug({log: "log", some: 1, context: 2, for: "The problem});
// Log messages that were sent to stdin or sclang.
log.stdin("1 + 1");
// Log messages that were received from stdout of sclang/scsynth.
log.stdout("2");
// Log messages that were emitted from stderr of sclang/scsynth.
log.stderr("ERROR: ...");
// Log OSC messages sent to scsynth.
log.sendosc({ address: "/ping" });
// Log OSC messages received from scsynth.
log.rscosc({ value: "pong" });
```
