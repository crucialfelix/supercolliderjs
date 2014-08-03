
/**
 * parse the commandline args for --path
 *
 * If not found then locate
 * .supercolliderjs json preferences file
 * starting in cwd
 *
 */

var program = require('commander'),
    join = require('path').join,
    pkg = require(join(__dirname, '../../package.json')),
    RcFinder = require('rcfinder'),
    prefsFinder = new RcFinder('.supercolliderjs', {});


function getPreferences(path) {
  return prefsFinder.find(path || process.cwd()) || {};
}


function parse() {
  program
    .version(pkg.version)
    .option('-p, --path <path>', 'Directory of sclang and scsynth [default=/Applications/SuperCollider/SuperCollider.app/Contents/Resources]')
    .parse(process.argv);

  var opts = getPreferences();

  if(program.path) {
    opts.path = program.path;
  }

  return opts;
}


module.exports = parse;
