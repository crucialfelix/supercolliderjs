
exports.lang = require('./lib/lang/sclang');
exports.server = require('./lib/server/server');
exports.scapi = require('./lib/scapi');
exports.resolveOptions = require('./lib/utils/resolveOptions').default;

exports.map = require('./lib/map');
exports.msg = require('./lib/server/osc/msg');

var scdryads = require('./lib/dryads');
exports.dryads = scdryads;

var dryadic = require('dryadic');

/**
 * Exports a dryadic() application creator function that automatically
 * includes the supercollider.js Dryads without needing to explicitly
 * load them with app.use()
 *
 * usage:
 *   `var app = require('supercolliderjs').dryadic()`
 */
exports.dryadic = function(root) {
  return dryadic.dryadic(root).use(scdryads.layer);
};
exports.Dryad = dryadic.Dryad;

/**
 * @deprecated These were renamed,
 * but these aliases will be kept in place until 1.0
 */
exports.sclang = exports.lang;
exports.scsynth = exports.server;
