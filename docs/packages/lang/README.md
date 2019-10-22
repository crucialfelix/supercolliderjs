# @supercollider/lang

Client library for the SuperCollider language. This package enables calling SuperCollider code from JavaScript.

If you are building something that just needs to communicate with sclang then you can install just this package.

- Spawns and manages one or more `sclang` processes.
- Interpret SuperCollider code and return results as equivalent JavaScript objects.
- Compile SynthDefs written in the SuperCollider language and return byte code.

## Usage


```js
// The long way
var sc = require('supercolliderjs');

// boot() returns a Promise that then resolves with an SCLang
sc.lang.boot().then(function(sclang) {

  // SCLang.interpret returns a Promise
  sclang.interpret('(1..8).pyramid')
    .then(function(result) {
      // result is a native javascript array
      console.log('= ' + result);
    }, function(error) {
      // syntax or runtime errors
      // are returned as javascript objects
      console.error(error);
    });

}, function(error) {
  console.error(error)
  // sclang failed to startup:
  // - executable may be missing
  // - class library may have failed with compile errors
});
```

```js
// The fast way
const sc = require('supercolliderjs');

// `run` boots a lanaguage interpreter
sc.lang.run(async function(sclang) {
  // This is an `async` function, so we can `await` the results of Promises.
  let pyr8 = await sclang.interpret('(1..8).pyramid');
  console.log(pyr8);

  let threePromises = [16, 24, 32].map(n => {
      return sclang.interpret(`(1..${n}).pyramid`)
  });

  // `interpret` many at the same time and wait until all are fulfilled.
  // Note that `sclang` is single threaded,
  // so the requests will still be processed by the interpreter one at a time.
  let pyrs = await Promise.all(threePromises);
  console.log(pyrs);

  await sclang.quit();
});
```

TODO: document options
executeFile
