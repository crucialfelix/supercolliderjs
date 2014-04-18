
var SCLang = require('../lib/nodejs/sclang.js');
var options = require('../lib/nodejs/parse-options');

var s = new SCLang(options());

s.boot();
