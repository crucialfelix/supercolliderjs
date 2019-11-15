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
