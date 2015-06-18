
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
  let abs = join(__dirname, '../../test-fixtures/', filename);
  let contents = fs.readFileSync(abs, {encoding: 'utf8'});
  io.parse(contents);
}

describe('sclang-io', function() {

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

});
