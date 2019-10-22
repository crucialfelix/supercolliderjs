[![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url] [![Dependency Status](https://david-dm.org/@supercollider/scapi.svg)](https://david-dm.org/@supercollider/scapi)

# @supercollider/scapi

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

Compatibility
-------------

Works on Node 10+

Source code is written in TypeScript and is usable in JavaScript [es2018](https://2ality.com/2017/02/ecmascript-2018.html) or [TypeScript](https://www.typescriptlang.org/docs/home.html) projects.

Contribute
----------

- Issue Tracker: https://github.com/crucialfelix/supercolliderjs/issues
- Source Code: https://github.com/crucialfelix/supercolliderjs

License
-------

MIT license

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE

[npm-url]: https://npmjs.org/package/@supercollider/scapi
[npm-version-image]: http://img.shields.io/npm/v/@supercollider/scapi.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/@supercollider/scapi.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
