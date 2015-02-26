
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
// var supercolliderjs = require('supercolliderjs');

// from within this example folder this is the same thing:
var supercolliderjs = require('../index.js');

var SCLang = supercolliderjs.sclang;

supercolliderjs.resolveOptions(null, {
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
