#!/usr/bin/env node

var help = [
  'Export a copy of scsynth for use as a standalone.'
];

// TODO sclang and all classfiles

var join = require('path').join;
var pkg = require(join(__dirname, '../package.json'));
var fs = require('fs');
var lib = join(__dirname, '../lib/js/');
var program = require('commander');
var resolveOptions = require(lib + 'resolveOptions');
var Server = require(lib + 'scsynth');
var options = {};

function copyFile(source, target, mode, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on('error', function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on('error', function(err) {
    done(err);
  });
  wr.on('close', function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      if (!err) {
        fs.chmodSync(target, mode);
      }
      cb(err);
      cbCalled = true;
    }
  }
}

function maybeDie(error, label) {
  if (error) {
    console.error('ERROR:' + label);
    console.error(error);
    console.trace();
    process.exit(1);
  }
  console.log(label);
}

function makeBin(dest, done) {
  var bin = join(dest, 'bin');
  if (fs.existsSync(bin)) {
    return done();
  }
  var binDir = join(dest, 'bin');
  fs.mkdir(binDir, function(error) {
    maybeDie(error, 'Create' + binDir);
    done();
  });
}

function makeExecScript(source, dest, done) {
  var execScript = '#!/bin/bash\n' +
    'exec "' + source + '" "$@"\n;';
  if (fs.exists(dest)) {
    return done();
  }
  fs.writeFile(dest,
    execScript,
    {
      mode: 0755
    },
    function(error) {
      maybeDie(error, 'Write exec script ' + dest);
      done();
    });
}

function exportScsynth(dest, done) {
  if (!fs.existsSync(dest)) {
    console.error('Destination directory does not exist' + dest);
    process.exit(1);
  }
  resolveOptions().then(function(options) {
    makeBin(dest, function() {
      var destscsynth = join(dest, 'bin', 'scsynth');

      copyFile(options.scsynth, destscsynth, 0755,
        function(error) {
          var scsynthPath = join(dest, 'scsynth');
          maybeDie(error, 'copy scsynth to ' + scsynthPath);
          makeExecScript(destscsynth,
            scsynthPath,
            done);
        });
    });
  });
}

program.version(pkg.version);

program
  .command('scsynth <dest>')
  .description('Copy scsynth to the destination directory')
  .action(function(dest) {
    function done() {
      console.log('Finished');
    }
    exportScsynth(dest, done);
  });

program.on('--help', function() {
  help.forEach(function(line) {
    console.info('    ' + line);
  });
});

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
