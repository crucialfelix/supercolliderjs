
/**
 * Default configs for scsynth and sclang
 *
 * Looks for '.supercollider.yaml' starting from current working directory.
 *
 * Matching config files in child directories are shallow merged into config files found in parent directories. So a local project's .supercollider.yaml can inherit from a ~/.supercollider.yaml
 *
 *
 */

import {Promise} from 'bluebird';

var path = require('path'),
    join = path.join,
    untildify = require('untildify'),
    os = require('os'),
    yaml = require('js-yaml'),
    fs   = require('fs'),
    _ = require('underscore');


function defaultOptions() {
  // should get this from server/default-server-options.json
  var opts = {
      'debug': false,
      'echo': true,
      'stdin': true,
      'langPort': 57120,
      'serverPort': 57110,
      'host': '127.0.0.1',
      'protocol': 'udp',
      'websocketPort': 4040
    },
    defaultRoot,
    platform = os.platform();

  if (platform === 'darwin') {
    defaultRoot = '/Applications/SuperCollider/SuperCollider.app/Contents/MacOS';
  } else if (platform === 'win32') {
    defaultRoot = 'C:\\Program Files (x86)\\SuperCollider';
  } else {
    defaultRoot = '/usr/local/bin';
  }

  // incorrect for windows
  opts.sclang = join(defaultRoot, 'sclang');
  opts.scsynth = join(defaultRoot, 'scsynth');
  return opts;
}

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

function filterUndefs(opts) {
  var cleaned = {};
  for (let key in opts) {
    let val = opts[key];
    if (!_.isUndefined(val)) {
      cleaned[key] = val;
    }
  }
  return cleaned;
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
  * @returns {Promise}
  */
export default function resolveOptions(configPath, commandLineOptions) {
  return new Promise((resolve, reject) => {

    function ok(opts, aPath) {
      var options = _.extend(defaultOptions(),
        filterUndefs(opts),
        filterUndefs(commandLineOptions),
        {configPath: aPath});

      options.sclang = path.resolve(untildify(options.sclang));
      options.scsynth = path.resolve(untildify(options.scsynth));

      resolve(options);
    }

    function checkPath(aPath) {
      let resolvedPath = path.resolve(untildify(aPath));
      return fs.existsSync(resolvedPath) ? resolvedPath : null;
    }

    function loadConfig(aPath) {
      try {
        var options = yaml.safeLoad(fs.readFileSync(aPath, 'utf8'));
        ok(options, aPath);
      } catch (e) {
        reject({configPath: aPath, message: 'Error reading config file', error: e});
      }
    }

    if (configPath) {
      // explicit config path supplied
      let explicitConfigPath = checkPath(configPath);
      if (!explicitConfigPath) {
        reject({message: 'Config file not found', configPath: configPath});
      } else {
        loadConfig(explicitConfigPath);
      }
    } else {
      // look in cwd
      let localConfigPath = checkPath('.supercollider.yaml');
      if (localConfigPath) {
        loadConfig(localConfigPath);
      } else {
        // look in ~
        let homeDirConfigPath = checkPath(path.join(getUserHome(), '.supercollider.yaml'));
        if (homeDirConfigPath) {
          loadConfig(homeDirConfigPath);
        } else {
          // use the defaults
          ok({}, null);
        }
      }
    }
  });
}
