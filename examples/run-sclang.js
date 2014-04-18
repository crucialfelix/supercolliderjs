
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

var SCLang = require('../lib/nodejs/sclang.js');
var options = require('../lib/nodejs/parse-options');

var sclang = new SCLang(options());

sclang.boot();

// wait for it to compile
console.log('Waiting 5 seconds till sc compiles...');

setTimeout(function() {
  sclang.write("1 + 1");
}, 5000);

