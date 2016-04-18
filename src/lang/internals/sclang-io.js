
/**
 * This parses the stdout of sclang
 * and detects changes of the interpreter state
 * and converts compilation errors into js objects.
 *
 * Also detects runtime errors and
 * results posted when sc code is evaluated from supercollider.js
 *
 * Convert errors and responses into JavaScript objects
 * Emit events when state changes
 */

import {EventEmitter} from 'events';
import _ from 'underscore';

const STATES = {
  NULL: null,
  BOOTING: 'booting',
  COMPILED: 'compiled',
  COMPILING: 'compiling',
  COMPILE_ERROR: 'compileError',
  READY: 'ready'
};


class SclangIO extends EventEmitter {

  constructor() {
    super();
    this.responseCollectors = {};
    this.capturing = {};
    this.calls = {};
    this.state = null;
    this.states = this.makeStates();

    // these are stored on the object
    // should be sent with a compile error event
    this.compileErrors = [];
    this.parseErrors = [];
    this.compileDirs = [];
  }

  /**
  * @param {string} input - parse the stdout of supercollider
  */
  parse(input) {
    var echo = true,
        startState = this.state,
        last = 0;
    this.states[this.state].forEach((stf) => {
      var match;
      if (this.state === startState) {
        while ((match = stf.re.exec(input)) !== null) {
          last = match.index + match[0].length;
          // do not post if any handler returns true
          if (stf.fn(match, input) === true) {
            echo = false;
          }
          // break if its not a /g regex with multiple results
          if (!stf.re.global) {
            break;
          }
        }
      }
    });
    if (echo) {
      this.emit('stdout', input);
    }
    // state has changed and there is still text to parse
    if (last < input.length && (startState !== this.state)) {
      // parse remainder with new state
      this.parse(input.substr(last));
    }
  }

  setState(newState) {
    if (newState !== this.state) {
      this.state = newState;
      this.emit('state', this.state);
    }
  }

  makeStates() {
    var self = this,
      states = {
        booting: [
          {
            re: /^compiling class library/m,
            fn: function(match, text) {
              self.setState(STATES.COMPILING);
              self.parseErrors = [text];
            }
          }
        ],
        compiling: [
          {
            re: /^compile done/m,
            fn: function() {
              var parsed = self.parseCompileErrors((self.parseErrors || []).join('\n'));
              self.compiledDirs = parsed.dirs;
              self.parseErrors = [];
              self.setState(STATES.COMPILED);
            }
          },
          {
            re: /^Library has not been compiled successfully/m,
            fn: function(match, text) {
              self.parseErrors.push(text);
              self.finalizeCompileErrors();
            }
          },
          {
            re: /^ERROR: There is a discrepancy\./m,
            fn: function(/*match*/) {
              self.finalizeCompileErrors();
            }
          },
          {
            // it may go directly into initClasses without posting compile done
            re: /Welcome to SuperCollider ([0-9a-zA-Z\-\.]+)\. /m,
            fn: function(match) {
              self.version = match[1];
              var parsed = self.parseCompileErrors((self.parseErrors).join('\n'));
              self.compiledDirs = parsed.dirs;
              delete self.parseErrors;
              self.setState(STATES.READY);
            }
          },
          {
            // it sometimes posts this sc3> even when compile failed
            re: /^[\s]*sc3>[\s]*$/m,
            fn: function(match, text) {
              self.parseErrors.push(text);
              self.finalizeCompileErrors();
            }
          },
          {
            // another case of just trailing off
            re: /^error parsing/m,
            fn: function(match, text) {
              self.parseErrors.push(text);
              self.finalizeCompileErrors();
            }
          },
          {
            // collect all output
            re: /(.+)/m,
            fn: function(match, text) {
              self.parseErrors.push(text);
            }
          }
        ],
        compileError: [],
        compiled: [
          {
            re: /Welcome to SuperCollider ([0-9a-zA-Z\-\.]+)\. /m,
            fn: function(match) {
              self.version = match[1];
              self.setState(STATES.READY);
            }
          },
          {
            re: /^[\s]*sc3>[\s]*$/m,
            fn: function(/*match, text*/) {
              self.setState(STATES.READY);
            }
          }
        ],
        ready: [
          {
            re: /^SUPERCOLLIDERJS\:([0-9a-f\-]+)\:([A-Za-z]+)\:(.*)$/mg,
            fn: function(match, text) {
              var
                guid = match[1],
                type = match[2],
                body = match[3],
                response,
                stdout,
                obj,
                lines,
                started = false,
                stopped = false;

              if (type === 'CAPTURE') {
                if (body === 'START') {
                  self.capturing[guid] = [];
                }
                if (body === 'START') {
                  lines = [];
                  // yuck
                  _.each(text.split('\n'), function(l) {
                    if (l.match(/SUPERCOLLIDERJS\:([0-9a-f\-]+)\:CAPTURE:START/)) {
                      started = true;
                    } else if (l.match(/SUPERCOLLIDERJS\:([0-9a-f\-]+)\:CAPTURE:END/)) {
                      stopped = true;
                    } else {
                      if (started && (!stopped)) {
                        lines.push(l);
                      }
                    }
                  });
                  self.capturing[guid].push(lines.join('\n'));
                }
                return true;
              }
              if (type === 'START') {
                self.responseCollectors[guid] = {
                  type: body,
                  chunks: []
                };
                return true;
              }
              if (type === 'CHUNK') {
                self.responseCollectors[guid].chunks.push(body);
                return true;
              }
              if (type === 'END') {
                response = self.responseCollectors[guid];
                stdout = response.chunks.join('');
                obj = JSON.parse(stdout);

                if (guid in self.calls) {
                  if (response.type === 'Result') {
                    // anything posted during CAPTURE should be forwarded
                    // to stdout
                    stdout = self.capturing[guid].join('\n');
                    delete self.capturing[guid];
                    if (stdout) {
                      self.emit('stdout', stdout);
                    }
                    self.calls[guid].resolve(obj);
                  } else {
                    if (response.type === 'SyntaxError') {
                      stdout = self.capturing[guid].join('\n');
                      obj = self.parseSyntaxErrors(stdout);
                      delete self.capturing[guid];
                    }
                    self.calls[guid].reject({type: response.type, error: obj});
                  }
                  delete self.calls[guid];
                } else {
                  // I hope sc doesn't post multiple streams at the same time
                  if (guid === '0') {
                    // out of band error
                    self.emit('error', {type: response.type, error: obj});
                  }
                }
                delete self.responseCollectors[guid];
                return true;
              }
            }
          },
          {
            // user compiled programmatically eg. with Quarks.gui button
            re: /^compiling class library/m,
            fn: function(match, text) {
              self.setState(STATES.COMPILING);
              self.parseErrors = [text];
              // reject all open calls and clear state
            }
          }
        ]
      };
    return states;
  }

  finalizeCompileErrors() {
    this.compileErrors = this.parseCompileErrors(this.parseErrors.join('\n'));
    this.parseErrors = [];
    this.compileDirs = this.compileErrors.dirs;
    this.setState(STATES.COMPILE_ERROR);
  }

  /**
   * Register for code that is sent to be interpreted
   * and will post a result or error.
   *
   * @param {string} guid
   * @param {Object} promise - a Promise or an object with reject, resolve
   */
  registerCall(guid, promise) {
    this.calls[guid]  = promise;
  }

  /**
    * parse syntax error from STDOUT runtime errors
    */
  parseSyntaxErrors(text) {
    var
        msgRe = /^ERROR: syntax error, (.+)$/m,
        msgRe2 = /^ERROR: (.+)$/m,
        fileRe = /in file '(.+)'/m,
        lineRe = /line ([0-9]+) char ([0-9]+):$/m;

    var msg = msgRe.exec(text) || msgRe2.exec(text),
        line = lineRe.exec(text),
        file = fileRe.exec(text),
        code = text.split('\n').slice(4, -3).join('\n').trim();
    return {
      msg: msg && msg[1],
      file: file && file[1],
      line: line && parseInt(line[1], 10),
      charPos: line && parseInt(line[2], 10),
      code: code
    };
  }

  /**
    * parse library compile errors error from STDOUT
    */
  parseCompileErrors(text) {
    var errors = {
      stdout: text,
      errors: [],
      extensionErrors: [],
      duplicateClasses: [],
      dirs: []
    };

    // NumPrimitives = 688
    // multiple:
    // compiling dir: ''
    var dirsRe = /^[\s]+compiling dir\:[\s]+'(.+)'$/mg,
        match,
        end = 0;

    while ((match = dirsRe.exec(text))) {
      errors.dirs.push(match[1]);
      end = match.index + match[0].length;
    }

    // the rest are the error blocks
    var rest = text.substr(end),
        // split on ---------------------
        // blocks = rest.split(/^\-+$/m),
        // message
        // in file 'path' line x char y:
        errRe = /([^\n]+)\n\s+in file '([^']+)'\n\s+line ([0-9]+) char ([0-9]+)/mg,
        nonExistentRe = /Class extension for nonexistent class '([A-Za-z0-9\_]+)[\s\S]+In file:'(.+)'/mg,
        duplicateRe = /^ERROR: duplicate Class found: '([A-Za-z0-9\_]+)'\n([^\n]+)\n([^\n]+)\n/mg,
        commonPath = /^\/Common/;

    while ((match = errRe.exec(rest))) {
      var file = match[2];
      // errors in Common library are posted as '/Common/...'
      if (commonPath.exec(file)) {
        file = errors.dirs[0] + file;
      }
      errors.errors.push({
        msg: match[1],
        file: file,
        line: parseInt(match[3], 10),
        char: parseInt(match[4], 10)
      });
    }

    while ((match = nonExistentRe.exec(text))) {
      errors.extensionErrors.push({
        forClass: match[1],
        file: match[2]
      });
    }

    while ((match = duplicateRe.exec(text)) !== null) {
      errors.duplicateClasses.push({
        forClass: match[1],
        files: [
          match[2],
          match[3]
        ]
      });
    }

    return errors;
  }
}


export { STATES, SclangIO };
