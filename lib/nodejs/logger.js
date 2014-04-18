
var colors = require('colors');

colors.setTheme({
  debug: 'blue',
  error: 'magenta',
  stdout: 'green',
  stderr: 'red',
  stdin: 'cyan'
});


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
	if(this.debug) {
		console.log(text.debug);
	}
};


Logger.prototype.err = function(text) {
	console.log(text.error);
};


Logger.prototype.stdin = function(text) {
	if(this.echo) {
		console.log(text.stdin);
	}
};


Logger.prototype.stdout = function(text) {
	if(this.echo) {
		console.log(text.stdout);
	}
};


Logger.prototype.stderr = function(text) {
	if(this.echo) {
		console.log(text.stderr);
	}
};


module.exports = Logger;
