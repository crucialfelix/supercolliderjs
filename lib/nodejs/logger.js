var chalk = require('chalk'),
    _ = require('underscore'),
    c = {
      debug: chalk.gray,
      error: chalk.magenta,
      stdout: chalk.green,
      stderr: chalk.bold.red,
      stdin: chalk.blue,
      sendosc: chalk.cyan,
      rcvosc: chalk.yellow
    };

/**
 * usage:
 *
 * log = new Logger(true, true);
 *
 * log.dbug('a message');
 * log.err('oh no');
 * log.stdin('command that I sent')
 * log.stdout('output from server')
 * log.stderr('error from server')
 *
 */
var Logger = function(debug, echo) {
  this.debug = debug;
  this.echo = echo;
};

Logger.prototype.dbug = function(text) {
  if (this.debug) {
    this.print('  debug  - ', text, c.debug);
  }
};

Logger.prototype.err = function(text) {
  this.print('  error  - ', text, c.error);
};

Logger.prototype.stdin = function(text) {
  if (this.echo) {
    this.print('  stdin  - ', text, c.stdin);
  }
};

Logger.prototype.stdout = function(text) {
  if (this.echo) {
    this.print('  stdout - ', text, c.stdout);
  }
};

Logger.prototype.stderr = function(text) {
  if (this.echo) {
    this.print('  stderr - ', text, c.stderr);
  }
};

Logger.prototype.sendosc = function(text) {
  if (this.echo) {
    this.print('  sendosc - ', text, c.sendosc);
  }
};

Logger.prototype.rcvosc = function(text) {
  if (this.echo) {
    this.print('  rcvosc  - ', text, c.rcvosc);
  }
};

Logger.prototype.print = function(label, text, color) {
  if (typeof text !== 'string') {
    text = JSON.stringify(text, undefined, 2);
  }
  var
    lines = text.split('\n'),
    clean = [label + lines[0]],
    rest = lines.slice(1);
  rest = rest.filter(function(s) { return s.length > 0; });
  rest = rest.map(function(s) {
    return '           ' + s;
  });
  clean = clean.concat(rest);
  console.log(color(clean.join('\n')));
};

module.exports = Logger;
