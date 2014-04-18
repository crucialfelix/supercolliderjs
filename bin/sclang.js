
var SCLang = require('../lib/nodejs/sclang.js');

var p = '/Users/crucial/code/supercollider/build/install/SuperCollider/SuperCollider-3-7.app/Contents/Resources/';

var s = new SCLang({'cwd': p});

s.boot();
