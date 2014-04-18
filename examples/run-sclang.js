
/**
 *
 * By default sclang.js echoes everything to the console with colors.
 *
 */

var SCLang = require('../lib/nodejs/sclang.js');

var dir = '/Users/crucial/code/supercollider/build/install/SuperCollider/SuperCollider-3-7.app/Contents/Resources/';

var sclang = new SCLang({'cwd': dir});
sclang.boot();

// wait for it to compile
console.log('Waiting 5 seconds till sc compiles...');
setTimeout(function() {
  sclang.write("1 + 1");
}, 5000);

