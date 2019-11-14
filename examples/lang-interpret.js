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
