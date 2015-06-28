
jest.autoMockOff();

// imports are getting mocked
// import {SclangIO, STATES} from '../sclang-io';

var scio = require('../sclang-io');
var SclangIO = scio.SclangIO;
var STATES = scio.STATES;

import {join} from 'path';
import fs from 'fs';

// parse a series of output files with the option to break into chunks
function feedIt(filename, io) {
  io.parse(readFile(filename));
}

function readFile(filename) {
  let abs = join(__dirname, '../../test-fixtures/', filename);
  return fs.readFileSync(abs, {encoding: 'utf8'});
}

describe('sclang-io', function() {

  describe('constructor', function() {
    it('should construct', function() {
      var io = new SclangIO();
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
    expect(io.compileErrors).toBeDefined;
    expect(io.compileErrors.duplicateClasses).toBeDefined;
    expect(io.compileErrors.duplicateClasses.length).toEqual(1);
    expect(io.compileErrors.duplicateClasses[0].forClass).toEqual('Crucial');
    expect(io.compileErrors.duplicateClasses[0].files[0]).toEqual('/Users/crucial/Library/Application Support/SuperCollider/downloaded-quarks/crucial-library/Crucial.sc');
  });

  describe('parseCompleErrors', () => {
    it('should parse Duplicate class errors', function() {
      var io = new SclangIO();
      io.setState(STATES.BOOTING);
      var errors = io.parseCompileErrors(readFile('io-duplicate-class.txt'));

      expect(errors).toBeDefined;
      expect(errors.duplicateClasses).toBeDefined;
      expect(errors.duplicateClasses.length).toEqual(1);
      expect(errors.duplicateClasses[0].forClass).toEqual('Crucial');
      expect(errors.duplicateClasses[0].files[0]).toEqual('/Users/crucial/Library/Application Support/SuperCollider/downloaded-quarks/crucial-library/Crucial.sc');
    });

    it('should parse extension for non-existent class', function() {
      var io = new SclangIO();
      io.setState(STATES.BOOTING);
      var errors = io.parseCompileErrors(readFile('io-extension-for-non-existent-class.txt'));

      expect(errors).toBeDefined;
      expect(errors.extensionErrors).toBeDefined;
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

});
