/**
 * Default configs for scsynth and sclang
 *
 * Looks for '.supercollider.yaml' starting from current working directory.
 *
 * Matching config files in child directories are shallow merged into config files found in parent directories. So a local project's .supercollider.yaml can inherit from a ~/.supercollider.yaml
 */
import fs from "fs";
import yaml from "js-yaml";
import _ from "lodash";
import os from "os";
import path from "path";
import untildify from "untildify";

import { SCError } from "../Errors";
import { defaults, ServerOptions } from "../server/options";

function getUserHome(): string {
  const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  if (!home) {
    throw new Error("Failed to find user home directory");
  }
  return home;
}

function defaultOptions(): ServerOptions {
  // should get this from server/default-server-options.json
  let opts: ServerOptions = {
    debug: false,
    echo: true,
    // stdin: true,
    websocketPort: 4040,
    ...defaults,
  };

  let defaultRoot;
  switch (os.platform()) {
    case "win32":
      defaultRoot = "C:\\Program Files (x86)\\SuperCollider";
      opts.sclang = path.join(defaultRoot, "sclang.exe");
      opts.scsynth = path.join(defaultRoot, "scsynth.exe");
      opts.sclang_conf = path.join(defaultRoot, "sclang_conf.yaml");
      break;
    case "darwin":
      opts.sclang = "/Applications/SuperCollider/SuperCollider.app/Contents/MacOS/sclang";
      opts.scsynth = "/Applications/SuperCollider/SuperCollider.app/Contents/Resources/scsynth";
      opts.sclang_conf = `${getUserHome()}/Library/Application Support/SuperCollider/sclang_conf.yaml`;
      break;
    default:
      defaultRoot = "/usr/local/bin";
      opts.sclang = path.join(defaultRoot, "sclang");
      opts.scsynth = path.join(defaultRoot, "scsynth");
      opts.sclang_conf = "/usr/local/share/SuperCollider/sclang_conf.yaml";
  }

  return opts;
}

function filterUndefs(opts: object): object {
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
 * @param {object} commandLineOptions -
 *            a dict of options to be merged over the loaded config.
 *            eg. supplied command line options --sclang=/some/path/to/sclang
 *
 */
export default function resolveOptions(
  configPath?: string | null,
  commandLineOptions?: object,
): Promise<ServerOptions> {
  return new Promise((resolve, reject) => {
    function ok(opts, aPath): void {
      var options: ServerOptions = _.extend(
        defaultOptions(),
        filterUndefs(opts),
        filterUndefs(commandLineOptions || {}),
        {
          configPath: aPath,
        },
      );

      if (options.sclang) {
        options.sclang = path.resolve(untildify(options.sclang));
      }
      if (options.scsynth) {
        options.scsynth = path.resolve(untildify(options.scsynth));
      }

      resolve(options);
    }

    function checkPath(aPath: string): string | null {
      let resolvedPath = path.resolve(untildify(aPath));
      return fs.existsSync(resolvedPath) ? resolvedPath : null;
    }

    function loadConfig(aPath: string): void {
      try {
        var options = yaml.safeLoad(fs.readFileSync(aPath, "utf8"));
        ok(options, aPath);
      } catch (error) {
        reject(
          new SCError(`Error reading config file ${aPath}: ${error.mesage}`, {
            error,
            configPath: aPath,
          }),
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
      let localConfigPath = checkPath(".supercollider.yaml");
      if (localConfigPath) {
        loadConfig(localConfigPath);
      } else {
        // look in ~
        let homeDirConfigPath = checkPath(path.join(getUserHome(), ".supercollider.yaml"));
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
