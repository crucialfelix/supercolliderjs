
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
    yaml = require('js-yaml'),
    fs   = require('fs'),
    _ = require('underscore'),
    Q = require('q'),
    platform = os.platform();

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

if (platform === 'darwin') {
  defaultRoot =
    '/Applications/SuperCollider/SuperCollider.app/Contents/Resources';
} else if (platform === 'win32') {
  defaultRoot = 'C:\\Program Files (x86)\\SuperCollider';
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
  * @param {String} configPath - explicit path to a yaml config file
  *           otherwise searches for nearest .supercollider.yaml
  * @param {Object} commandLineOptions -
  *            a dict of options to be merged over the loaded config.
  *            eg. supplied command line options --path=/some/path
  * @returns: promise
  */
function resolveOptions(configPath, commandLineOptions) {
  var deferred = Q.defer(),
      promise = deferred.promise;

  function ok(o) {
    var options = _.extend(defaultOptions, o, commandLineOptions);
    options.sclang = path.resolve(untildify(options.sclang));
    options.scsynth = path.resolve(untildify(options.scsynth));
    deferred.resolve(options);
  }

  if(configPath) {
    configPath = untildify(configPath);
    try {
      var options = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
      ok(options);
    } catch (e) {
      deferred.reject('Error reading config file: ' + configPath + e);
    }
  } else {
    loadConfig().then(ok, deferred.reject);
  }

  return promise;
}

module.exports = resolveOptions;
