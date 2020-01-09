# @supercollider/lang
[![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

<i>Client library for the SuperCollider language: sclang. This package enables calling SuperCollider code from JavaScript.</i>

- Spawns and manages one or more `sclang` processes.
- Interpret SuperCollider code and return results as equivalent JavaScript objects.
- Compile SynthDefs written in the SuperCollider language and return byte code.
- Used by atom-supercollider

If you are building something that just needs to communicate with sclang then you can install just this package.

## Usage

### Boot

Start the `sclang` executable as a subprocess, returning a Promise.

```js
const sc = require("supercolliderjs");

sc.lang.boot().then(
  function(lang) {
    // Up and ready for action
    console.log(lang);

    // quit the process programmatically
    lang.quit();
  },
  // Error handler if it fails to start or fails to compile
  error => console.error,
);

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/boot-lang.js>source</a></small>


```js
const Lang = require("supercolliderjs").lang.default;
const l = new Lang(options);
l.boot();
```

`sclang` will compile it's class library, and this may result in syntax or compile errors.

Resolves with a list of SuperCollider class file directories that were compiled:

```typescript
{dirs: [/*compiled directories*/]}
```

or rejects with:

```typescript
{
  dirs: [],
  compileErrors: [],
  parseErrors: [],
  duplicateClasses: [],
  errors[],
  extensionErrors: [],
  stdout: 'compiling class library...etc.'
}
```

See `SclangCompileResult` in `packages/lang/src/internals/sclang-io.ts` for full details.

### Interpret simple async await style

```js
const sc = require("supercolliderjs");

sc.lang.boot().then(async function(lang) {
  // This function is declared as `async`
  // so for any function calls that return a Promise we can `await` the result.

  // This is an `async` function, so we can `await` the results of Promises.
  const pyr8 = await lang.interpret("(1..8).pyramid");
  console.log(pyr8);

  const threePromises = [16, 24, 32].map(n => {
    return lang.interpret(`(1..${n}).pyramid`);
  });

  // `interpret` many at the same time and wait until all are fulfilled.
  // Note that `lang` is single threaded,
  // so the requests will still be processed by the interpreter one at a time.
  const pyrs = await Promise.all(threePromises);
  console.log(pyrs);

  // Get a list of all UGen subclasses
  const allUgens = await lang.interpret("UGen.allSubclasses");

  // Post each one to STDOUT
  allUgens.forEach(ugenClass => console.log(ugenClass));

  await lang.quit();
});

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/lang-interpret.js>source</a></small>


### Interpret with full error handling

```js
const sc = require("supercolliderjs");

function makePyramid(lang) {
  lang.interpret("(1..8).pyramid").then(
    function(result) {
      // result is a native javascript array
      console.log("= " + result);
      lang.quit();
    },
    function(error) {
      // syntax or runtime errors
      // are returned as javascript objects
      console.error(error);
    },
  );
}

// Verbose example to show Promises and full error handling
sc.lang.boot().then(
  // ok booted
  lang => {
    makePyramid(lang);
  },
  // failed to boot
  error => {
    console.error(error);
    // Either:
    // 1. The executable may be missing, incorrect path etc.
    // 2. The class library may have failed with compile errors
  },
);

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/lang-interpret-the-long-way.js>source</a></small>



### Options

```typescript
sc.lang.boot(options)
// or
const Lang = require("supercolliderjs").lang.default;
const l = new Lang(options);
l.boot();
```

```typescript
{
  // post verbose messages to console
  debug: boolean;
  // echo all commands sent TO sclang to console
  echo: boolean;
  // provide an alternate console like object for logging. eg. winston
  log?: Console;
  // path to sclang executable
  sclang: string;
  // To start sclang and immediately execute one file
  executeFile?: string;
  // path to existing non-default conf file
  sclang_conf?: string;

  // post sclang stdin to console
  stdin: boolean;
  // if specifying a non-default conf file then you may wish to fail if you got the path wrong
  // rather than fall back to the default one
  failIfSclangConfIsMissing: boolean;
  // pass in a configuration without having to write it to a file
  conf: SCLangConf;
}
```

See: packages/lang/src/options.ts


### executeFile

```js
await lang.executeFile("./some-supercollider-piece.scd");
```

Documentation
-------------

[Documentation](https://crucialfelix.github.io/supercolliderjs/#/packages/lang/api)

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

[npm-url]: https://npmjs.org/package/@supercollider/lang
[npm-version-image]: http://img.shields.io/npm/v/@supercollider/lang.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/@supercollider/lang.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
