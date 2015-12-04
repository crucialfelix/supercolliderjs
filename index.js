
exports.lang = require('./lib/lang/sclang');
exports.server = require('./lib/server/server');
exports.scapi = require('./lib/scapi');
exports.resolveOptions = require('./lib/utils/resolveOptions');

exports.map = require('./lib/map');
exports.msg = require('./lib/server/osc/msg');

// alpha: this API will be changed in 0.10
exports.dryads = require('./lib/server/dryads');

// deprec: this will be removed in 1.0
exports.sclang = exports.lang;
exports.scsynth = exports.server;
