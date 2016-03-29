
exports.lang = require('./lib/lang/sclang');
exports.server = require('./lib/server/server');
exports.scapi = require('./lib/scapi');
exports.resolveOptions = require('./lib/utils/resolveOptions').default;

exports.map = require('./lib/map');
exports.msg = require('./lib/server/osc/msg');

var dryadic = require('dryadic');
exports.Dryad = dryadic.Dryad;

var scdryads = require('./lib/dryads');
exports.dryads = scdryads;

exports.dryadic = scdryads.dryadic;
exports.play = scdryads.play;
exports.h = scdryads.h;

/**
 * @deprecated These were renamed,
 * but these aliases will be kept in place until 1.0
 */
exports.sclang = exports.lang;
exports.scsynth = exports.server;
