
/**
 * Default configs for scsynth and sclang
 *
 * Looks for '.supercollider.yaml' starting from current working directory.
 *
 * Matching config files in child directories are shallow merged into config files found in parent directories. So a local project's .supercollider.yaml can inherit from a ~/.supercollider.yaml
 *
 *
 */

var program = require('commander'),
    path = require('path'),
    join = path.join,
    untildify = require('untildify'),
    os = require('os'),
    _ = require('underscore'),
    Q = require('q');

var defaultOptions = {
    'debug': true,
    'echo': true,
    'stdin': true,
    'langPort': 57120,
    'serverPort': 57110,
    'host': '127.0.0.1',
    'protocol': 'udp',
    'websocketPort': 4040
  },
  defaultRoot;

if (os.platform() === 'darwin') {
  defaultRoot =
    '/Applications/SuperCollider/SuperCollider.app/Contents/Resources';
} else {
  defaultRoot = '/usr/local/bin';
}

defaultOptions.sclang = join(defaultRoot, 'sclang');
defaultOptions.scsynth = join(defaultRoot, 'scsynth');

function loadConfig() {
  return require('commander-config').lookUpSettings('.supercollider');
}

/**
  * load configuration files
  * and merge options into a final dict
  *
  * @param {string} path - explicit path to a yaml config file
  *           otherwise searches for nearest .supercollider.yaml
  * @param {dict} commandLineOptions -
  *            a dict of options to be merged over the loaded config.
  *            eg. supplied command line options --path=/some/path
  * @returns: promise
  */
function resolveOptions(path, commandLineOptions) {
  // TODO: if path then just load that as yaml
  var deferred = Q.defer(),
      promise = deferred.promise;

  loadConfig().then(function(o) {
    var options = _.extend(defaultOptions, o, commandLineOptions);
    options.sclang = untildify(options.sclang);
    options.scsynth = untildify(options.scsynth);
    deferred.resolve(options);
  }, function(err) {
    deferred.reject(err);
  });
  return promise;
}

module.exports = resolveOptions;
