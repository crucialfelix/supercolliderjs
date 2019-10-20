# `@supercollider/scapi`

This works together with the 'API' quark to implement a simple two-way communication protocol for node <-> SuperCollider.

The SuperCollider side is here:
https://github.com/supercollider-quarks/API

And this is the nodejs end.

It connects with an sclang process using UDP OSC and then sends OSC messages to '/API/call'

Sent messages return a promise, the responses are received here from sclang and the promises are resolved (or rejected if there was an error).

This requires writing named handlers in SuperCollider and registering them with the API. From the node side, you make a call using that name and pass it some args and get back your response.

This was an older solution. Probably just using `@supercollider/lang` is easier now.

Start SuperCollider
Install the API quark ( > 2.0 )

Activate the OSC responders in supercollider:

```
API.mountDuplexOSC
```

