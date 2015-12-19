
jest.autoMockOff();

// imports are getting mocked
// import {SclangIO, STATES} from '../sclang-io';

var scio = require('../sclang-io');
var SclangIO = scio.SclangIO;
var STATES = scio.STATES;

import {join} from 'path';
import fs from 'fs';

// parse a series of output files with the option to break into chunks
function readFile(filename) {
  let abs = join(__dirname, 'fixtures', filename);
  return fs.readFileSync(abs, {encoding: 'utf8'});
}

function feedIt(filename, io) {
  io.parse(readFile(filename));
}

describe('sclang-io', function() {

  describe('constructor', function() {
    it('should construct', function() {
      var io = new SclangIO();
      expect(io).toBeTruthy();
    });
  });

  describe('setState', function() {
    it('should setState', function() {
      var io = new SclangIO();
      io.setState(STATES.BOOTING);
      expect(io.state).toEqual(STATES.BOOTING);
    });
  });

  it('should ignore simple text', function() {
    var io = new SclangIO();
    io.setState(STATES.BOOTING);
    feedIt('io-na.txt', io);
    expect(io.state).toEqual(STATES.BOOTING);
  });

  it('should detect succesful compile', function() {
    var io = new SclangIO();
    io.setState(STATES.BOOTING);
    feedIt('io-compile-success.txt', io);
    expect(io.state).toEqual(STATES.READY);
  });

  it('should detect succesful compile despite errors in startup', function() {
    var io = new SclangIO();
    io.setState(STATES.BOOTING);
    feedIt('errors-but-did-compile.txt', io);
    // its COMPILED but didn't go to READY on sc3>
    expect(io.state).toEqual(STATES.READY);
  });

  it('should detect programmatic compiling', function() {
    var io = new SclangIO();
    io.setState(STATES.READY);
    feedIt('io-programmatic-compile.txt', io);
    expect(io.state).toEqual(STATES.COMPILING);
  });

  it('should detect a duplicate class compile failure', function() {
    var io = new SclangIO();
    io.setState(STATES.BOOTING);
    feedIt('io-duplicate-class.txt', io);
    expect(io.state).toEqual(STATES.COMPILE_ERROR);
    expect(io.compileErrors).toBeDefined();
    expect(io.compileErrors.duplicateClasses).toBeDefined();
    expect(io.compileErrors.duplicateClasses.length).toEqual(1);
    expect(io.compileErrors.duplicateClasses[0].forClass).toEqual('Crucial');
    expect(io.compileErrors.duplicateClasses[0].files[0]).toEqual('/Users/crucial/Library/Application Support/SuperCollider/downloaded-quarks/crucial-library/Crucial.sc');
  });

  describe('parseCompleErrors', () => {
    it('should parse Duplicate class errors', function() {
      var io = new SclangIO();
      io.setState(STATES.BOOTING);
      var errors = io.parseCompileErrors(readFile('io-duplicate-class.txt'));

      expect(errors).toBeDefined();
      expect(errors.duplicateClasses).toBeDefined();
      expect(errors.duplicateClasses.length).toEqual(1);
      expect(errors.duplicateClasses[0].forClass).toEqual('Crucial');
      expect(errors.duplicateClasses[0].files[0]).toEqual('/Users/crucial/Library/Application Support/SuperCollider/downloaded-quarks/crucial-library/Crucial.sc');
    });

    it('should parse extension for non-existent class', function() {
      var io = new SclangIO();
      io.setState(STATES.BOOTING);
      var errors = io.parseCompileErrors(readFile('io-extension-for-non-existent-class.txt'));

      expect(errors).toBeDefined();
      expect(errors.extensionErrors).toBeDefined();
      expect(errors.extensionErrors[0].forClass).toEqual('Document');
      expect(errors.extensionErrors[0].file).toEqual('/deprecated/3.7/deprecated-3.7.sc');
    });

    // other errors:
    // msg file line char
    /*
    it('should parse class syntax error', function() {
      var io = new SclangIO();
      io.setState(STATES.BOOTING);
      var errors = io.parseCompileErrors(readFile('io-class-syntax-error.txt'));
      console.log(errors);
      expect(errors).toBeDefined;
      expect(errors.extensionErrors).toBeDefined;
      expect(errors.extensionErrors[0].forClass).toEqual('Document');
      expect(errors.extensionErrors[0].file).toEqual('/deprecated/3.7/deprecated-3.7.sc');
    });

    it('should parse double class syntax error', function() {
      var io = new SclangIO();
      io.setState(STATES.BOOTING);
      var errors = io.parseCompileErrors(readFile('io-class-syntax-error-2.txt'));
      console.log(errors);
      expect(errors).toBeDefined;
      expect(errors.extensionErrors).toBeDefined;
      expect(errors.extensionErrors[0].forClass).toEqual('Document');
      expect(errors.extensionErrors[0].file).toEqual('/deprecated/3.7/deprecated-3.7.sc');
    });
    */
  });

  describe('SyntaxErrors', function() {

    it('should parse a SyntaxError from stdout', function() {
      var io = new SclangIO();
      io.setState(STATES.READY);

      var text = readFile('trig-not-defined.txt');
      var error = io.parseSyntaxErrors(text);

      expect(error).toBeTruthy();
      expect(error.msg).toBe('Variable \'trig\' not defined.');
      expect(error.file).toBe('selected text');
      expect(error.line).toBe(9);
      expect(error.charPos).toBe(47);
    });

    pit('on successful interpret, should still post output to stdout', function() {
      var io = new SclangIO();
      io.setState(STATES.READY);

      // stick a blank Promise into register so it will
      // parse the response
      io.registerCall('725282d0-a31c-11e5-9a22-59ba9f49924a', {
        resolve: () => {},
        reject: () => {}
      });

      return new Promise((resolve) => {
        // this is what is really being tested:
        // does it post to STDOUT
        io.on('stdout', (out) => {
          console.log('STDOUT:', out);
          resolve(true);
        });

        var text = readFile('forward-stdout.txt');
        io.parse(text);
      });
    });
  });

});
