const sc = require("supercolliderjs");

sc.lang.boot().then(async function(lang) {
  // This function is declared as `async`
  // so for any function calls that return a Promise we can `await` the result.

  // Get a list of all UGen subclasses
  const allUgens = await lang.interpret("UGen.allSubclasses");

  // Post each one to STDOUT
  allUgens.forEach(ugenClass => console.log(ugenClass));

  // lang.executeFile("./standard-supercollider.scd");

  lang.quit();
});
