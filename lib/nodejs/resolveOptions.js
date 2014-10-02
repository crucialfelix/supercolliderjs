
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
    'debug': false,
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

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

/**
  * load configuration files
  * and merge options into a final dict
  *
  * @param {String} configPath - explicit path to a yaml config file
  *           otherwise tries
  *             .supercollider.yaml
  *             ~/.supercollider.yaml
  *
  * @param {Object} commandLineOptions -
  *            a dict of options to be merged over the loaded config.
  *            eg. supplied command line options --sclang=/some/path/to/sclang
  *
  * @returns: promise
  */
function resolveOptions(configPath, commandLineOptions) {
  var deferred = Q.defer(),
      promise = deferred.promise;

  function ok(o, configPath) {
    var options = _.extend(defaultOptions, o, commandLineOptions);
    options.sclang = path.resolve(untildify(options.sclang));
    options.scsynth = path.resolve(untildify(options.scsynth));
    options.configPath = configPath;
    deferred.resolve(options);
  }

  function loadPath(configPath) {
    var fileExists;
    configPath = path.resolve(configPath);
    fileExists = fs.existsSync(configPath);
    if(fileExists) {
      try {
        var options = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
        ok(options, configPath);
      } catch (e) {
        deferred.reject({configPath: configPath, message:'Error reading config file', error: e});
      }
    }
    return fileExists;
  }

  if(configPath) {
    // explict config path
    configPath = untildify(configPath);
    if(!loadPath(configPath)) {
      deferred.reject({message: 'Config file not found', configPath: configPath});
      return;
    }
  } else {
    if(!loadPath('.supercollider.yaml')) {
      configPath = path.join(getUserHome(), '.supercollider.yaml');
      if(!loadPath(configPath)) {
        ok({}, null);
      }
    }
  }

  return promise;
}

module.exports = resolveOptions;
