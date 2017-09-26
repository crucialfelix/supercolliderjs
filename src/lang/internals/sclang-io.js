/**
  * @flow
  */

import * as net from 'net';
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
  CONNECTING: 'connecting',
  READY: 'ready'
};

export const RESULT_LISTEN_HOST = 'localhost';
export const RESULT_LISTEN_PORT = 22967;
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
  capturing: Object;
  calls: Object;
  state: ?string;
  output: Array<string>;
  result: Object;
  resultSocket: Object;
  partialMsg: string; // holds any message data we've received so far

  constructor() {
    super();
    this.states = this.makeStates();
    this.resultSocket = this.makeSocket();
    this.reset();
  }

  connectSCLang() {
    this.setState(STATES.CONNECTING);
    // notify the parent we're ready to connect, it's responsible for sending
    // the command to SC to connect to the socket
    this.emit('connect-ready');
  }

  makeSocket() {
    var sock = net.createServer(socket => {
      console.log("got a new connection")
      if(this.state === STATES.CONNECTING) {
        socket.on('data', (data) => {
          this.handleTCPData(data);
        });
        socket.on('end', () => {
          console.log("client disconnected");
        });
        this.setState(STATES.READY);
      } else {
        console.log("Got connection when we weren't expecting it!");
      }
    });
    console.log("listening for TCP connection...");
    sock.listen(RESULT_LISTEN_PORT, RESULT_LISTEN_HOST);
    return sock;
  }

  handleTCPData(data) {
    var handledChars = 0;
    var frameEnd = data.indexOf(FRAME_BYTE);
    console.log("frameEnd: " + frameEnd);
    while(frameEnd != -1) {
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
    this.capturing = {};
    this.calls = {};
    this.state = null;
    // these are stored on the object
    // and are sent with compile error/success event
    this.output = [];
    this.result = {};
  }

  /**
  * @param {string} input - parse the stdout of supercollider
  */
  parse(input: string) {
    var echo = true, startState = this.state, last = 0;
    // run through the handlers for this state until one causes a state change
    // or we've gone through all of them
    this.states[this.state].forEach(stf => {
      var match;
      if (this.state === startState) {
        // why is this a `while` loop and not an `if` statement?
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

    // anything left over should be emitted to stdout ?
    // This might result in some content being emitted twice.
    // Currently if there is anything after SUPERCOLLIDERJS.interpret
    // it is emitted.
    // if (last < input.length  && (startState === this.state)) {
    //   console.log('leftovers:', input.substr(last));
    //   // this.parse(input.substr(last));
    // }

    // state has changed and there is still text to parse
    if (last < input.length && startState !== this.state) {
      // parse remainder with new state
      this.parse(input.substr(last));
    }
  }

  setState(newState: ?string) {
    if (newState !== this.state) {
      this.state = newState;
      this.emit('state', this.state);
    }
  }

  makeStates(): Object {
    return {
      booting: [
        {
          re: /^compiling class library/m,
          fn: (match: RegExMatchType, text: string) => {
            this.reset();
            this.setState(STATES.COMPILING);
            this.pushOutputText(text);
          }
        }
      ],
      compiling: [
        {
          re: /^compile done/m,
          fn: () => {
            this.processOutput();
            this.setState(STATES.COMPILED);
          }
        },
        {
          re: /^Library has not been compiled successfully/m,
          fn: (match: RegExMatchType, text: string) => {
            this.pushOutputText(text);
            this.processOutput();
            this.setState(STATES.COMPILE_ERROR);
          }
        },
        {
          re: /^ERROR: There is a discrepancy\./m,
          fn: (/*match*/) => {
            this.processOutput();
            this.setState(STATES.COMPILE_ERROR);
          }
        },
        {
          // it may go directly into initClasses without posting compile done
          re: /Welcome to SuperCollider ([0-9A-Za-z\-\.]+)\. /m,
          fn: (match: RegExMatchType) => {
            this.result.version = match[1];
            this.processOutput();
            this.connectSCLang();
          }
        },
        {
          // it sometimes posts this sc3> even when compile failed
          re: /^[\s]*sc3>[\s]*$/m,
          fn: (match: RegExMatchType, text: string) => {
            this.pushOutputText(text);
            this.processOutput();
            this.setState(STATES.COMPILE_ERROR);
          }
        },
        {
          // another case of just trailing off
          re: /^error parsing/m,
          fn: (match: RegExMatchType, text: string) => {
            this.pushOutputText(text);
            this.processOutput();
            this.setState(STATES.COMPILE_ERROR);
          }
        },
        {
          // collect all output
          re: /(.+)/m,
          fn: (match: RegExMatchType, text: string) => {
            this.pushOutputText(text);
          }
        }
      ],
      compileError: [],
      compiled: [
        {
          re: /Welcome to SuperCollider ([0-9A-Za-z\-\.]+)\. /m,
          fn: (match: RegExMatchType) => {
            this.result.version = match[1];
            this.connectSCLang();
          }
        },
        {
          re: /^[\s]*sc3>[\s]*$/m,
          fn: (/*match:RegExMatchType, text*/) => {
            this.connectSCLang();
          }
        }
      ],
      connecting: [
        {
          re: /(.+)/m,
          fn: (match: RegExMatchType, text: string) => {
            console.log(text);
          }
        }
      ],
      // REPL is now active
      ready: [
        {
          // There may be multiple SUPERCOLLIDERJS matches in a block of text.
          // ie. this is a multi-line global regex
          // This fn is called for each of them with a different match each time
          // but the same text body.
          re: /^SUPERCOLLIDERJS\:([0-9A-Za-z\-]+)\:([A-Za-z]+)\:(.*)$/mg,
          fn: (match: RegExMatchType, text: string) => {
            var guid = match[1],
              type = match[2],
              body = match[3],
              response,
              stdout,
              obj,
              lines,
              started = false,
              stopped = false;

            switch (type) {
              case 'CAPTURE':
                console.log("hit capture");
                if (body === 'START') {
                  this.capturing[guid] = [];
                  lines = [];
                  // yuck
                  _.each(text.split('\n'), (l: string) => {
                    if (
                      l.match(
                        /SUPERCOLLIDERJS\:([0-9A-Za-z\-]+)\:CAPTURE:START/
                      )
                    ) {
                      started = true;
                      console.log("starting capture");
                    } else if (
                      l.match(/SUPERCOLLIDERJS\:([0-9A-Za-z\-]+)\:CAPTURE:END/)
                    ) {
                      stopped = true;
                      console.log("finished receiving capture");
                      this.calls[guid].responseCapture = this.capturing[guid].join('\n') + lines.join('\n');
                      delete this.capturing[guid];
                      if(this.calls[guid].responseObj !== null) {
                        // we already got the response TCP msg, so we can finish now
                        this.finishResponse(guid);
                      }
                    } else {
                      if (started && !stopped) {
                        lines.push(l);
                      }
                    }
                  });
                  if(started && !stopped) {
                    this.capturing[guid].push(lines.join('\n'));
                  }
                }
                return true;
              default:
            }
          }
        },
        {
          re: /^SUPERCOLLIDERJS.interpreted$/mg,
          fn: (match: RegExMatchType, text: string) => {
            let rest = text.substr(match.index + 28);
            // remove the prompt ->
            rest = rest.replace(/-> \r?\n?/, '');
            this.emit('stdout', rest);
            return true;
          }
        },
        {
          // user compiled programmatically eg. with Quarks.gui button
          re: /^compiling class library/m,
          fn: (match: RegExMatchType, text: string) => {
            this.reset();
            this.setState(STATES.COMPILING);
            this.pushOutputText(text);
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

  /**
   * write
   *
   * Send a raw string to sclang to be interpreted
   * callback is called after write is complete.
   */
  write(chunk: string, callback: ?Function) {
    this.process.stdin.write(chunk, 'UTF-8');
    // Send the escape character which is interpreted by sclang as:
    // "evaluate the currently accumulated command line as SC code"
    this.process.stdin.write('\x0c', null, callback);
  }

  // handle a response received over the TCP socket from the supercollider
  // process.
  handleMsg(msg: Object) {
    console.log("Handling TCP Message");
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
    console.log("FINISHING RESPONSE");
    var call = this.calls[guid]
    if(call.responseType === 'Result') {
      // anything posted during CAPTURE should be forwarded to stdout
      this.emit('stdout', this.calls.responseCapture);
      call.promise.resolve(call.responseObj);
    } else {
      if (call.responseType === 'SyntaxError') {
        obj = this.parseSyntaxErrors(call.responseCapture);
      }
      console.log(call.responseType);
      console.log(call.responseObj);
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
   * Push text posted by sclang during library compilation
   * to the .output stack for later procesing
   */
  pushOutputText(text: string) {
    this.output.push(text);
  }

  /**
   * Consume the compilation output stack, merging any results
   * into this.result and resetting the stack.
   */
  processOutput() {
    let parsed = this.parseCompileOutput((this.output || []).join('\n'));

    // merge with any previously processed
    _.each(parsed, (value, key) => {
      if (_.isArray(value)) {
        this.result[key] = (this.result[key] || []).concat(value);
      }
      if (_.isString(value)) {
        this.result[key] = (this.result[key] || '') + value;
      }
    });

    this.output = [];
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
