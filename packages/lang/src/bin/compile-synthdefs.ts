#!/usr/bin/env node
/* eslint no-console: 0 */
var path = require('path');
var sc = require(path.join(__dirname, '../index'));
var pkg = require(path.join(__dirname, '../package.json'));
var program = require('commander');
var fs = require('fs');
var Promise = require('bluebird');

var help = [];

program.on('--help', function() {
  help.forEach(function(line) {
    console.info('    ' + line);
  });
});

program.version(pkg.version);
program.usage('<source-files> <destination>');
program.parse(process.argv);

if (program.args.length < 2) {
  program.help();
}

// the shell will expand any globs
var dest = path.resolve(program.args.pop());
var sources = program.args.map(function(p) {
  return path.resolve(p);
});
// an invalid source glob will not be expanded
// and resolve will just return it as is.
// Should probably warn and skip
// and warn and skip synthdefs/ rather than synthdefs/*

sc.lang
  .boot({ stdin: false, debug: false })
  .then(function(sclang) {
    function removeAll() {
      return sclang.interpret('SynthDescLib.default.synthDescs.removeAll();');
    }

    function interpretFiles() {
      return Promise.map(sources, function(src) {
        console.log(src);
        return sclang.executeFile(src).error(function(error) {
          sclang.log.err('Failure while executing file:' + src);
          sclang.log.err(error);
        });
      });
    }

    // returns SynthDescs as a JSON-ready dict
    function writeDefs() {
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
      `
      );
    }

    function writeDescs(descs) {
      // console.log(JSON.stringify(descs, null, 2));
      var writeFile = Promise.promisify(fs.writeFile);
      return writeFile(
        path.join(dest, 'synthDefs.json'),
        JSON.stringify(descs, null, 2)
      );
    }

    return removeAll().then(interpretFiles).then(writeDefs).then(writeDescs);
  })
  .then(
    function() {
      process.exit(0);
    },
    function(error) {
      console.error(error);
      process.exit(1);
    }
  );
