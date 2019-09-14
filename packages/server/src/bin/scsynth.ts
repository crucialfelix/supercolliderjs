#!/usr/bin/env node
/* eslint no-console: 0 */
import program from "commander";
import { join } from "path";

import Server, { ServerArgs } from "..";

const help = `
    Run scsynth (the supercollider synthesis server) using the configuration defined in the nearest .supercollider.yaml searching up from the current working directory.

    Examples:

    supercollider-server
    supercollider-server --scsynth=/path/to/scsynth
`;

/* eslint @typescript-eslint/no-var-requires: 0 */
const pkg = require(join(__dirname, "../../package.json"));

function truthy(input: string | undefined | boolean): boolean {
  return input + "" !== "false";
}

program
  .version(pkg.version)
  .option("--scsynth <path>", "Path to scsynth executable")
  .option("--serverPort <port>", "UDP port for the server to listen on")
  .option("-v, --verbose", "Post debugging messages (default: false)", truthy, false);

program.on("--help", () => help.split("\n").forEach(console.info));

program.parse(process.argv);

const options: ServerArgs = {};

["config", "scsynth", "serverPort", "verbose"].forEach(function(k) {
  if (k in program) {
    options[k] = program[k];
  }
});

const s = new Server(options);

s.boot();

s.on("exit", function() {
  console.warn("scsynth exited");
  console.info(options);
  process.exit(1);
});
