
/**
 *
 * By default sclang.js echoes everything to the console with colors.
 *
 *

 Usage: run-sclang [options]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -p, --path     Path to sclang [default=/Applications/SuperCollider/SuperCollider.app/Contents/Resources/sclang]

 */

// npm install supercolliderjs
// then import like so:
// var scjs = require('supercolliderjs');

// from within this example folder this is the same thing:
var scjs = require('../index.js');

var SCLang = scjs.sclang;

scjs.resolveOptions(null, {
  // no STDIN, all input will be programmatic
  stdin: false,
  echo: true,
  debug: true
}).then(function(options) {

  var sclang = new SCLang(options);

  sclang.boot()
    .then(function() {

      // raw write
      sclang.write('1 + 1;');

      setTimeout(function() {
        sclang.quit()
          .then(function() {
            console.log('sclang process has exited');
          });
      }, 3000);
    });
});
