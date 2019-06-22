/**
 * Default configs for scsynth and sclang
 *
 * Looks for '.supercollider.yaml' starting from current working directory.
 *
 * Matching config files in child directories are shallow merged into config files found in parent directories. So a local project's .supercollider.yaml can inherit from a ~/.supercollider.yaml
 *
 *
 */

import { Promise } from 'bluebird';

var path = require('path'),
  join = path.join,
  untildify = require('untildify'),
  os = require('os'),
  yaml = require('js-yaml'),
  fs = require('fs'),
  _ = require('lodash');
import SCError from '../Errors';

function defaultOptions() {
  // should get this from server/default-server-options.json
  let opts = {
    debug: false,
    echo: true,
    stdin: true,
    langPort: 57120,
    serverPort: 57110,
    host: '127.0.0.1',
    protocol: 'udp',
    websocketPort: 4040
  };

  let defaultRoot;
  switch (os.platform()) {
    case 'win32':
      defaultRoot = 'C:\\Program Files (x86)\\SuperCollider';
      opts.sclang = join(defaultRoot, 'sclang.exe');
      opts.scsynth = join(defaultRoot, 'scsynth.exe');
      opts.sclang_conf = join(defaultRoot, 'sclang_conf.yaml');
      break;
    case 'darwin':
      opts.sclang = '/Applications/SuperCollider/SuperCollider.app/Contents/MacOS/sclang';
      opts.scsynth = '/Applications/SuperCollider/SuperCollider.app/Contents/Resources/scsynth';
      opts.sclang_conf = `${getUserHome()}/Library/Application Support/SuperCollider/sclang_conf.yaml`;
      break;
    default:
      defaultRoot = '/usr/local/bin';
      opts.sclang = join(defaultRoot, 'sclang');
      opts.scsynth = join(defaultRoot, 'scsynth');
      opts.sclang_conf = '/usr/local/share/SuperCollider/sclang_conf.yaml';
  }

  return opts;
}

function getUserHome() {
  const home = process.env.HOME ||
    process.env.HOMEPATH ||
    process.env.USERPROFILE;
  if (!home) {
    throw new Error('Failed to find user home directory');
  }
  return home;
}

function filterUndefs(opts) {
  var cleaned = {};
  _.each(opts, (value, key) => {
    if (!_.isUndefined(value)) {
      cleaned[key] = value;
    }
  });
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
      var options = _.extend(
        defaultOptions(),
        filterUndefs(opts),
        filterUndefs(commandLineOptions),
        { configPath: aPath }
      );

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
      } catch (error) {
        reject(
          new SCError(`Error reading config file ${aPath}: ${error.mesage}`, {
            error,
            configPath: aPath
          })
        );
      }
    }

    if (configPath) {
      // explicit config path supplied
      let explicitConfigPath = checkPath(configPath);
      if (!explicitConfigPath) {
        reject(new Error(`Config file not found: ${configPath}`));
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
        let homeDirConfigPath = checkPath(
          path.join(getUserHome(), '.supercollider.yaml')
        );
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
