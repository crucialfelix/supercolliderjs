
jest.autoMockOff();  // not that you are paying any attention to me
jest.mock('child_process');
jest.dontMock('../sclang');
jest.dontMock('../sclang-io');

//  import SCLang from '../sclang';
var sclang = require('../sclang');
var SCLang = sclang.default;

var _ = require('underscore');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
import {STATES} from '../sclang-io';
var Q = require('q');

class MockProcess extends EventEmitter {
  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
  }
  kill() {}
}

describe('sclang', function() {

  describe('default constructor', function() {
    it('should exist', function() {
      var sclang = new SCLang();
      expect(sclang).toBeDefined();
    });
  });

  describe('sclangConfigOptions', function() {

    it('should include sc-classes', function() {
      var sclang = new SCLang();
      var opts = sclang.sclangConfigOptions();
      expect(opts.includePaths.length).toEqual(1);
      var isIn = _.some(opts.includePaths, function(p) {
        return p.match(/sc\-classes/);
      });
      expect(isIn).toBeDefined();
    });

    it('should read a supplied sclang_conf', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({
        sclang_conf: path.join(__dirname, '../../test-fixtures/sclang_test_conf.yaml')
      });
      // as well as sc-classes
      expect(opts.includePaths.length).toEqual(2 + 1);
      expect(opts.excludePaths.length).toEqual(1);
    });

    it('should merge sclang_conf with supplied includePaths', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({
        sclang_conf: path.join(__dirname, '../../test-fixtures/sclang_test_conf.yaml'),
        includePaths: [
          '/custom/one',
          '/path/include/one'
        ],
        excludePaths: [
          '/custom/two'
        ],
      });
      expect(opts.includePaths.length).toEqual(3 + 1);
      expect(opts.excludePaths.length).toEqual(2);
    });

  });

  describe('args', function() {
    var sclang = new SCLang();
    var args = sclang.args({langPort: 4});
    // [ '-i', 'supercolliderjs', '-u', 4 ]
    expect(args.length).toEqual(4);
    expect(args[3]).toEqual(4);
  });

  describe('boot', function() {
    pit('should call spawnProcess', function() {
      var sclang = new SCLang();
      var SPAWNED = 'SPAWNED';
      spyOn(sclang, 'spawnProcess').andReturn(SPAWNED);
      var fail = (err) => this.fail(err);
      return sclang.boot().then((result) => expect(result).toEqual(SPAWNED)).fail(fail);
    });
  });

  describe('makeSclangConfig', function() {
    pit('should write a yaml file and resolve with a path', function() {
      var sclang = new SCLang();
      return sclang.makeSclangConfig({includePaths: [], excludePaths: []})
        .then((tmpPath) => expect(tmpPath).toBeTruthy()).fail(this.fail);
    });
  });

  describe('sclangConfigOptions', function() {
    it('should include sc-classes', function() {
      var sclang = new SCLang();
      var config = sclang.sclangConfigOptions();
      expect(config.includePaths.length).toEqual(1);
      expect(config.includePaths[0].match(/sc-classes/)).toBeTruthy();
    });

    it('postInlineWarning should not be undefined', function() {
      var sclang = new SCLang();
      var config = sclang.sclangConfigOptions({});
      expect(config.postInlineWarning).toBeDefined();

      config = sclang.sclangConfigOptions({postInlineWarning: undefined});
      expect(config.postInlineWarning).toEqual(false);
    });
  });

  describe('makeStateWatcher', function() {
    it('should echo events from SclangIO to SCLang', function() {
      var sclang = new SCLang();
      var did = false;
      var stateWatcher = sclang.makeStateWatcher();
      sclang.on('state', () => {
        did = true;
      });
      stateWatcher.emit('state', 'READY');
      expect(did).toEqual(true);
    });
  });

  describe('installListeners', function() {

    it('should install event listeners', function() {
      var subprocess = new MockProcess();
      var sclang = new SCLang();
      sclang.installListeners(subprocess, true);
    });

    it('should respond to subprocess events', function() {
      /**
       * TODO needs to be properly mocked
       */
      var subprocess = new MockProcess();
      var sclang = new SCLang();
      sclang.setState(STATES.BOOTING);
      sclang.installListeners(subprocess, true);

      process.stdin.emit('data', '');
      subprocess.stdout.emit('data', 'data');
      subprocess.stderr.emit('data', 'data');
      subprocess.emit('error', 'error');
      subprocess.emit('close', 0, 'close');
      subprocess.emit('exit', 0, 'exit');
      subprocess.emit('disconnect');
    });
  });

  describe('spawnProcess', function() {
    // mock spawn to return an event emitter
    it('should spawnProcess', function() {
      var sclang = new SCLang();
      spyOn(sclang, 'installListeners');
      var promise = sclang.spawnProcess('/tmp/fake/path', {});
      expect(promise).toBeTruthy();
    });
  });

  describe('interpret', function() {
    it('should call this.write', function() {
      var sclang = new SCLang();
      spyOn(sclang, 'write').andReturn(null);
      var p = sclang.interpret('1 + 1', '/tmp/source.scd');
      expect(sclang.write).toHaveBeenCalled();
    });
  });

  describe('executeFile', function() {
    it('should call this.write', function() {
      var sclang = new SCLang();
      spyOn(sclang, 'write').andReturn(null);
      var p = sclang.executeFile('/tmp/source.scd', false, true, true);
      expect(sclang.write).toHaveBeenCalled();
    });
  });

  describe('quit', function() {
    pit('should quit silently if not booted', function() {
      var sclang = new SCLang();
      return sclang.quit();
    });

    pit('should quit process', function() {
      var sclang = new SCLang();
      sclang.process = new MockProcess();
      spyOn(sclang.process, 'kill').andReturn(null);
      var p = sclang.quit().then(() => {
        expect(sclang.process).toEqual(null);
      });
      sclang.process.emit('exit');
      return p;
    });
  });

});
