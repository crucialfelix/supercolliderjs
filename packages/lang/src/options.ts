import fs from "fs";
import yaml from "js-yaml";
import _ from "lodash";
import os from "os";
import path from "path";
import untildify from "untildify";
import { SCLangArgs } from './sclang';


/**
 * sclang_conf.yaml format
 */
export interface SCLangConf {
  includePaths: string[];
  excludePaths: string[];
  postInlineWarnings: boolean;
}

export interface SCLangOptions {
  debug: boolean;
  echo: boolean;
  log?: Console;
  // path to sclang executable
  sclang: string;
  // To start sclang and immediately execute one file
  executeFile?: string;
  // path to existing conf file
  sclang_conf?: string;

  stdin: boolean;
  failIfSclangConfIsMissing: boolean;
  conf: SCLangConf;
}

function loadConfig(aPath: string): Partial<SCLangOptions> {
  try {
    return yaml.safeLoad(fs.readFileSync(aPath, "utf8"));
  } catch (error) {
    throw new Error(`Error reading config file ${aPath}: ${error.mesage} configPath: ${aPath}`);
  }
}

function loadDotSupercolliderYaml(): Partial<SCLangArgs> {
  const paths = [
    ".supercollider.yaml",
    path.join(os.homedir(), ".supercollider.yaml")
  ];
  for (const cpath of paths) {
    if(cpath) {
      const resolvedPath = path.resolve(untildify(cpath));
      const checked = fs.existsSync(resolvedPath) ? resolvedPath : null;
      if(checked) {
        console.log(`Loading config: ${checked}`);
        return loadConfig(cpath);
      }
    }
  }
  // No config file found
  return {};
}


function defaultOptions(): SCLangOptions {
  const opts: SCLangOptions = {
    debug: false,
    echo: true,
    stdin: false,
    sclang: "sclang",
    failIfSclangConfIsMissing: false,
    conf: {
      includePaths: [],
      excludePaths: [],
      postInlineWarnings: false,
    },
  };

  switch (os.platform()) {
    case "win32": {
      const defaultRoot = "C:\\Program Files (x86)\\SuperCollider";
      opts.sclang = path.join(defaultRoot, "sclang.exe");
      // eslint-disable-next-line @typescript-eslint/camelcase
      opts.sclang_conf = path.join(defaultRoot, "sclang_conf.yaml");
      break;
    }
    case "darwin": {
      opts.sclang = "/Applications/SuperCollider/SuperCollider.app/Contents/MacOS/sclang";
      // eslint-disable-next-line @typescript-eslint/camelcase
      opts.sclang_conf = `${os.homedir()}/Library/Application Support/SuperCollider/sclang_conf.yaml`;
      break;
    }
    default: {
      const defaultRoot = "/usr/local/bin";
      opts.sclang = path.join(defaultRoot, "sclang");
      // eslint-disable-next-line @typescript-eslint/camelcase
      opts.sclang_conf = "/usr/local/share/SuperCollider/sclang_conf.yaml";
    }
  }

  return opts;
}

const defaults = defaultOptions();

export function resolveOptions(options: SCLangArgs = {}): SCLangOptions {
  const opts = _.defaults({}, options, loadDotSupercolliderYaml(), defaults);

  if (opts.sclang) {
    opts.sclang = path.resolve(untildify(opts.sclang));
  }
  if (opts.sclang_conf) {
    // eslint-disable-next-line @typescript-eslint/camelcase
    opts.sclang_conf = path.resolve(untildify(opts.sclang_conf));
  }
  return opts;
}