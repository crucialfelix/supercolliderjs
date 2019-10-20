#!/usr/bin/env node
/* eslint no-console: 0 */
import path from "path";
import { boot } from "../index";
import program from "commander";
import { promises as fs } from "fs";
import { JSONObjectType } from "@supercollider/server";

/* eslint @typescript-eslint/no-var-requires: 0 */
const pkg = require(path.join(__dirname, "../../package.json"));

const help = [];

program.on("--help", function() {
  help.forEach(function(line) {
    console.info("    " + line);
  });
});

program.version(pkg.version);
program.usage("<source-files> <destination>");
program.parse(process.argv);

if (program.args.length < 2) {
  program.help();
}

// the shell will expand any globs
const lastArg = program.args[program.args.length - 1];
const dest = path.resolve(lastArg);
const sources = program.args.map(function(p) {
  return path.resolve(p);
});
// an invalid source glob will not be expanded
// and resolve will just return it as is.
// Should probably warn and skip
// and warn and skip synthdefs/ rather than synthdefs/*

async function main(): Promise<void> {
  const sclang = await boot({ stdin: false, debug: false });

  function removeAll(): Promise<void> {
    return sclang.interpret("SynthDescLib.default.synthDescs.removeAll();");
  }

  function interpretFiles(): Promise<void[]> {
    return Promise.all(
      sources.map(src => {
        return sclang.executeFile(src).catch(error => {
          console.error(`${src} ${error}`, error);
          throw error;
        });
      }),
    );
  }

  // returns SynthDescs as a JSON-ready dict
  function writeDefs(): Promise<JSONObjectType> {
    return sclang.interpret(
      `
      var descs = Dictionary.new;
      SynthDescLib.default.synthDescs
        .keysValuesDo({ arg defName, synthDesc;
          synthDesc.def.writeDefFile("` +
        dest +
        `");
          descs[defName] = synthDesc.asJSON();
        });
      descs
      `,
    );
  }

  function writeDescs(descs: JSONObjectType): Promise<void> {
    return fs.writeFile(path.join(dest, "synthDefs.json"), JSON.stringify(descs, null, 2));
  }

  await removeAll();
  await interpretFiles();
  const descs = await writeDefs();
  await writeDescs(descs);
}

main().then(
  () => process.exit(0),
  (error: Error) => {
    console.error(error);
    process.exit(1);
  },
);
