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
sc.lang
  .boot()
  .then(lang => {
    makePyramid(lang);
  })
  .catch(
    // Language interpreter failed to boot
    function(error) {
      console.error(error);
      // sclang failed to startup:
      // - The executable may be missing, incorrect path
      // - The class library may have failed with compile errors
    },
  );
