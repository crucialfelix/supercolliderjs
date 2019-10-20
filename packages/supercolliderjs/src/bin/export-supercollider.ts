#!/usr/bin/env node
/* eslint no-console: 0 */
import { resolveOptions } from "@supercollider/server";
import program from "commander";
import { promises as fs } from "fs";
import { ncp } from "ncp";
import path from "path";

const help = ["Export a copy of scsynth for use as a standalone."];

// TODO sclang and all classfiles

/* eslint @typescript-eslint/no-var-requires: 0 */
const pkg = require(path.join(__dirname, "../../package.json"));

async function makeDir(dest: string): Promise<void> {
  try {
    await fs.mkdir(dest);
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
}

async function makeExecScript(source: string, dest: string): Promise<void> {
  const execScript = [
    "#!/bin/bash",
    'DIR="${BASH_SOURCE%/*}";',
    'if [[ -z "$@" ]]; then',
    '  ARGS="-u 57110";',
    "else",
    '  ARGS="$@";',
    "fi",
    'if [[ -z "$SC_SYNTHDEF_PATH" ]]; then',
    '  export SC_SYNTHDEF_PATH="$DIR/synthdefs/"',
    "fi",
    'export SC_PLUGIN_PATH="$DIR/plugins/";',
    'exec "$DIR/bin/scsynth" $ARGS;',
  ];

  return fs.writeFile(dest, execScript.join("\n"), { mode: "0755" });
}

const ncpp = (src: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    ncp(src, dest, (err?: Error) => {
      err ? reject(err) : resolve();
    });
  });
};

async function exportScsynth(dest: string): Promise<void> {
  const options = resolveOptions();
  await makeDir(dest);
  await makeDir(path.join(dest, "bin"));

  const destScsynth = path.join(dest, "bin", "scsynth");
  // The typing is wrong: resolveOptions does return this
  if (!options.scsynth) {
    throw new Error("No path set for scsynth executable");
  }
  const srcPlugins = path.join(path.dirname(options.scsynth), "..", "Resources", "plugins");

  await ncpp(options.scsynth, destScsynth);
  await ncpp(srcPlugins, path.join(dest, "plugins"));
  await makeDir(path.join(dest, "synthdefs"));
  await makeExecScript(destScsynth, path.join(dest, "scsynth"));
}

program
  .command("scsynth <dest>")
  .description("Copy scsynth and plugins to the destination directory")
  .action(function(dest) {
    exportScsynth(path.resolve(dest)).then(function() {
      console.log("Finished");
    });
  });

program.on("--help", function() {
  help.forEach(function(line) {
    console.info("    " + line);
  });
});

program.version(pkg.version).parse(process.argv);
