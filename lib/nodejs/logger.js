
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
    this.print(c.debug('  debug  - '), c.debug(text));
  }
};

Logger.prototype.err = function(text) {
  this.print(c.error('  error  - '), text);
};

Logger.prototype.stdin = function(text) {
  if (this.echo) {
    this.print(c.stdin('  stdin  - '), c.stdin(text));
  }
};

Logger.prototype.stdout = function(text) {
  if (this.echo) {
    this.print(c.stdout('  stdout - '), text);
  }
};

Logger.prototype.stderr = function(text) {
  if (this.echo) {
    this.print(c.stderr('  stderr - '), c.stderr(text));
  }
};

Logger.prototype.sendosc = function(text) {
  if (this.echo) {
    this.print(c.sendosc('  sendosc - '), c.sendosc(text));
  }
};

Logger.prototype.rcvosc = function(text) {
  if (this.echo) {
    console.log(c.rcvosc('  rcvosc  - '), c.rcvosc(text));
  }
};

Logger.prototype.print = function(label, text) {
  if (typeof text !== 'string') {
    text = JSON.stringify(text);
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
  console.log(clean.join('\n'));
};

module.exports = Logger;
