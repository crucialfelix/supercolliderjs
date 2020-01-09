{{> header}}

- Packs OSC messages and bundles into a Node `Buffer` for sending
- Unpacks received OSC messages and bundles from a Node `Buffer`

It does not concern itself with network connections.

The OSC support is limited to the types and features of SuperCollider server.
This means it does not support inline arrays `[f]`

This is used internally by `@supercollider/server`

## Usage

```js
const osc = require('@supercollider/osc');

// TODO: DEMONSTRATE API
```

{{> footer }}