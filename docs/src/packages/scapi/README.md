{{> header}}

This works together with the 'API' quark to implement a simple two-way communication protocol for node <-> SuperCollider.

It connects with an sclang process using UDP OSC and then sends OSC messages to '/API/call'

The SuperCollider quark is here:
https://github.com/supercollider-quarks/API

And this package is the nodejs side.

Sent messages return a promise, the responses are received here from sclang and the promises are resolved (or rejected if there was an error).

This requires writing named handlers in SuperCollider and registering them with the API. From the node side, you make a call using that name and pass it some args and get back your response.

This was an older solution. Probably just using `@supercollider/lang` is easier now.

Note: this is not included in the [`supercolliderjs`](https://npmjs.org/package/supercolliderjs) package.

## Install

```shell
npm install @supercollider/scapi
```

Start SuperCollider
Install the API quark ( > 2.0 )

## Usage

Start SuperCollider and activate the OSC responders:

```supercollider
API.mountDuplexOSC
```

{{> footer }}