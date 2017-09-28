/**
  * @flow
  */

import _ from 'lodash';
import EventEmitter from 'events';
import { SCLangError } from '../../Errors';

type RegExMatchType = Object; // Array<string|number>;
// import { SclangResultType } from '../../Types';

export const STATES = {
  NULL: null,
  BOOTING: 'booting',
  COMPILED: 'compiled',
  COMPILING: 'compiling',
  COMPILE_ERROR: 'compileError',
  READY: 'ready',
  CAPTURING: 'capturing'
};

const FRAME_BYTE = 0xff; // should never appear in valid UTF8

/**
 * This parses the stdout of sclang and detects changes of the
 * interpreter state and converts compilation errors into js objects.
 *
 * Also detects runtime errors and results posted when sc code
 * is evaluated from supercollider.js
 *
 * Convert errors and responses into JavaScript objects
 *
 * Emit events when state changes
 *
 * @private
 */
export class SclangIO extends EventEmitter {
  states: Object;
  calls: Object;
  state: ?string;
  result: Object;
  partialMsg: string; // holds any message data we've received so far
  partialStdout: string; // holds any leftover STDOUT data in-between data callbacks
  captured: Array<string>; // holds the in-progress capture
  captureGUID: string;

  constructor() {
    super();
    this.states = this.makeStates();
    this.reset();
  }

  /*
   * Handle a block of TCP data representing the response data from SCLang. We
   * don't make any assumptions about the alignment of the callback data with
   * the messages, and just look for a 0xff byte which indicates the end of a
   * message (which is just a JSON string).
   */
  handleTCPData(data) {
    var handledChars = 0;
    var frameEnd = data.indexOf(FRAME_BYTE);
    while(frameEnd !== -1) {
      // we've got the end of a message - handle it
      var msg = this.partialMsg + data.slice(handledChars, frameEnd);
      this.partialMsg = '';
      this.handleMsg(JSON.parse(msg));
      handledChars = frameEnd+1; // also swallow the divider char
      // look for another message
      frameEnd = data.indexOf(FRAME_BYTE, handledChars);
    }
    // we've handled all complete messages, store any leftover data
    this.partialMsg += data.slice(handledChars);
  }

  reset() {
    this.partialMsg = '';
    this.partialStdout = '';
    this.captured = [];
    this.captureGUID = '';
    this.calls = {};
    this.state = null;
    // this is stored on the object
    // and are sent with compile error/success event
    this.result = {};
  }

  /**
  * @param {string} input - parse the stdout of supercollider, line-by-line
  */
  parse(input: string) {
    var inputLines = input.split('\n');
    var lastIdx = inputLines.length - 1;
    // grab any data leftover from the last call
    inputLines[0] = this.partialStdout + inputLines[0];
    // if this data doesn't end with a newline, save the last partial line
    // if it does end with a newline, the last item is '' anyways
    // note that state handlers take care of state transitions, so the state
    // can change from line-to-line here
    this.partialStdout = inputLines[lastIdx];
    for(var lineIdx = 0; lineIdx < lastIdx; lineIdx += 1) {
      var handlers = this.states[this.state];
      // default to echoing the input if there are no handlers that match
      var echo = inputLines[lineIdx];
      for(var handlerIdx = 0; handlerIdx < handlers.length; handlerIdx += 1) {
        var handler = handlers[handlerIdx];
        var match;
        if((match = handler.re.exec(inputLines[lineIdx])) !== null) {
          echo = handler.fn(match, inputLines[lineIdx]);
          break; // stop after the first matching handler
        }
      }
      if(echo !== null) {
        // either the handler told us to echo or no handlers matched
        this.emit('stdout', echo + '\n');
      }
    }
  }

  setState(newState: ?string) {
    if (newState !== this.state) {
      this.state = newState;
      this.emit('state', this.state);
    }
  }

  // state handlers are passed in their regex match as well as the full line,
  // and return whatever they want echoed to STDOUT, or null to output nothing
  makeStates(): Object {
    return {
      booting: [
        {
          re: /^compiling class library/,
          fn: (match: RegExMatchType, text: string) => {
            this.reset();
            this.setState(STATES.COMPILING);
            this.captureLine(text);
            return null;
          }
        },
        {
          // collect all other output
          re: /(.*)/,
          fn: (match: RegExMatchType, text: string) => {
            this.captureLine(text);
            return null;
          }
        }
      ],
      compiling: [
        {
          re: /^compile done/,
          fn: (match: RegExMatchType, text: string) => {
            this.setState(STATES.COMPILED);
            this.captureLine(text);
            this.processOutput();
            return null;
          }
        },
        {
          re: /^Library has not been compiled successfully/,
          fn: (match: RegExMatchType, text: string) => {
            this.captureLine(text);
            this.setState(STATES.COMPILE_ERROR);
            this.processOutput();
            return null;
          }
        },
        {
          re: /^ERROR: There is a discrepancy\./,
          fn: (match: RegExMatchType, text: string) => {
            // currently this will miss the line "numClassDeps 1323   gNumClasses 2644"
            // that comes after this line and it won't be handled as part of the
            // "process output" block. Not sure if that's a problem.
            this.captureLine(text);
            this.setState(STATES.COMPILE_ERROR);
            this.processOutput();
            return null;
          }
        },
        {
          // it may go directly into initClasses without posting compile done
          re: /Welcome to SuperCollider ([0-9A-Za-z\-\.]+)\. /,
          fn: (match: RegExMatchType, text: string) => {
            this.result.version = match[1];
            this.processOutput();
            this.setState(STATES.READY);
            return text;
          }
        },
        {
          // it sometimes posts this sc3> even when compile failed
          re: /^[\s]*sc3>[\s]*$/,
          fn: (match: RegExMatchType, text: string) => {
            this.captureLine(text);
            this.processOutput();
            this.setState(STATES.COMPILE_ERROR);
            return null;
          }
        },
        {
          // another case of just trailing off
          re: /^error parsing/,
          fn: (match: RegExMatchType, text: string) => {
            this.captureLine(text);
            this.processOutput();
            this.setState(STATES.COMPILE_ERROR);
            return null;
          }
        },
        {
          // collect all other output
          re: /(.*)/,
          fn: (match: RegExMatchType, text: string) => {
            this.captureLine(text);
            return null;
          }
        }
      ],
      compileError: [],
      compiled: [
        {
          re: /Welcome to SuperCollider ([0-9A-Za-z\-\.]+)\. /,
          fn: (match: RegExMatchType, text: string) => {
            this.result.version = match[1];
            this.setState(STATES.READY);
            return text;
          }
        },
        {
          re: /^[\s]*sc3>[\s]*(.*)/,
          fn: (match: RegExMatchType) => {
            this.setState(STATES.READY);
            var info = match[1];
            return info === '' ? null : info;
          }
        }
      ],
      // REPL is now active
      ready: [
        {
          re: /^SUPERCOLLIDERJS\:([0-9A-Za-z\-]+)\:CAPTURE\:START$/,
          fn: (match: RegExMatchType) => {
            this.captureGUID = match[1];
            this.captured = [];
            this.setState(STATES.CAPTURING);
            return null;
          }
        },
        {
          re: /^-> ?(.*)/,
          fn: (match: RegExMatchType) => {
            var info = match[1];
            return info === '' ? null : info;
          }
        },
        {
          // user compiled programmatically eg. with Quarks.gui button
          re: /^compiling class library/,
          fn: (match: RegExMatchType, text: string) => {
            this.reset();
            this.setState(STATES.COMPILING);
            this.captureLine(text);
            return null;
          }
        },
        {
          // just print and discard any other output
          re: /(.*)/,
          fn: (match: RegExMatchType, text: string) => {
            return text;
          }
        }
      ],
      capturing: [
        {
          re: /^SUPERCOLLIDERJS\:([0-9A-Za-z\-]+)\:CAPTURE\:END$/,
          fn: (match: RegExMatchType) => {
            var guid = match[1];
            if(guid !== this.captureGUID) {
              throw(new Error(`Got different GUIDs in capture start(${this.captureGUID}) and end(${guid})`));
            }
            this.calls[guid].responseCapture = this.captured.join('\n');
            if(this.calls[guid].responseObj !== null) {
              // we already got the response TCP msg, so we can finish now
              this.finishResponse(guid);
            }
            this.setState(STATES.READY);
            return null;
          }
        },
        {
          // capture all other output. don't print now because it gets printed
          // once we've determined whether it's a Result or Error. the downside
          // of this is we don't see the output until the end, which might be
          // bad for a long-running operation that prints as it goes
          re: /(.*)/,
          fn: (match: RegExMatchType, text: string) => {
            this.captureLine(text);
            return null;
          }
        }
      ]
    };
  }

  /**
   * Register a Promise for a block of code that is being sent
   * to sclang to be interpreted.
   *
   * @param {Object} promise - a Promise or an object with reject, resolve
   */
  registerCall(guid: string, promise: Promise<*> | Object) {
    this.calls[guid] = {
      responseType: null,
      responseObj: null,
      responseCapture: null,
      promise: promise
    };
  }

  // handle a response received over the TCP socket from the supercollider
  // process.
  handleMsg(msg: Object) {
    if(!(msg.guid in this.calls)) {
      // I hope sc doesn't post multiple streams at the same time
      if (msg.guid === '0') {
        // out of band error
        this.emit('error', { type: msg.type, error: msg.data });
      }
      return
    }

    var call = this.calls[msg.guid];

    call.responseObj = msg.data;
    call.responseType = msg.type;

    if(call.responseCapture !== null) {
      // we've already received the STDOUT capture, so we can finish handling
      // the message
      this.finishResponse(msg.guid);
    }
  }

  // we have a complete response with STDOUT and TCP data ready to be handled
  finishResponse(guid) {
    var call = this.calls[guid]
    if(call.responseType === 'Result') {
      // anything posted during CAPTURE should be forwarded to stdout
      this.emit('stdout', call.responseCapture);
      call.promise.resolve(call.responseObj);
    } else {
      if (call.responseType === 'SyntaxError') {
        call.responseObj = this.parseSyntaxErrors(call.responseCapture);
      }
      call.promise.reject(
        new SCLangError(
          `Interpret error: ${call.responseObj.errorString}`,
          call.responseType,
          call.responseObj
        )
      );
    }
    delete this.calls[guid];
  }

  /**
    * Parse syntax error from STDOUT runtime errors.
    */
  parseSyntaxErrors(text: string): Object {
    var msgRe = /^ERROR: syntax error, (.+)$/m,
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
   * Store text posted by sclang for later procesing
   */
  captureLine(text: string) {
    this.captured.push(text);
  }

  /**
   * Consume the compilation output stack, merging any results
   * into this.result and resetting the stack.
   */
  processOutput() {
    let parsed = this.parseCompileOutput((this.captured || []).join('\n'));

    // merge with any previously processed
    _.each(parsed, (value, key) => {
      if (_.isArray(value)) {
        this.result[key] = (this.result[key] || []).concat(value);
      }
      if (_.isString(value)) {
        this.result[key] = (this.result[key] || '') + value;
      }
    });

    this.captured = [];
  }

  /**
    * Parse library compile errors and information
    * collected from sclang STDOUT.
    */
  parseCompileOutput(text: string): Object {
    let errors = {
      stdout: text,
      errors: [],
      extensionErrors: [],
      duplicateClasses: [],
      dirs: []
    };

    // NumPrimitives = 688
    // multiple:
    // compiling dir: ''
    let dirsRe = /^[\s]+compiling dir\:[\s]+'(.+)'$/mg;
    let match;
    let end = 0;

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
        files: [match[2], match[3]]
      });
    }

    return errors;
  }
}
