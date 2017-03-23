import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
// import {STATES} from '../internals/sclang-io';
import SCLang from '../sclang';

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
    it('should include supercollider-js', function() {
      var sclang = new SCLang();
      var opts = sclang.sclangConfigOptions();
      expect(opts.includePaths.length).toEqual(1);
      var isIn = _.some(opts.includePaths, function(p) {
        // and that directory should really exist
        return p.match(/supercollider\-js$/) && fs.statSync(p);
      });
      expect(isIn).toBeTruthy();
    });

    it('should read a supplied sclang_conf', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({
        sclang_conf: path.join(__dirname, 'fixtures', 'sclang_test_conf.yaml')
      });
      // as well as supercollider-js
      expect(opts.includePaths.length).toEqual(2 + 1);
      expect(opts.excludePaths.length).toEqual(1);
    });

    it('should merge sclang_conf with supplied includePaths', function() {
      var sclang = new SCLang({});
      var opts = sclang.sclangConfigOptions({
        sclang_conf: path.join(__dirname, 'fixtures', 'sclang_test_conf.yaml'),
        includePaths: ['/custom/one', '/path/include/one'],
        excludePaths: ['/custom/two']
      });
      expect(opts.includePaths.length).toEqual(3 + 1);
      expect(opts.excludePaths.length).toEqual(2);
    });
  });

  describe('args', function() {
    it('should format args correctly', function() {
      var sclang = new SCLang();
      var args = sclang.args({ langPort: 4 });
      // [ '-i', 'supercolliderjs', '-u', 4 ]
      expect(args.length).toEqual(4);
      expect(args[3]).toEqual(4);
    });
  });

  describe('boot', function() {
    it('should call spawnProcess', function() {
      var sclang = new SCLang();
      var SPAWNED = 'SPAWNED';
      spyOn(sclang, 'spawnProcess').and.returnValue(SPAWNED);
      return sclang
        .boot()
        .then(result => expect(result).toEqual(SPAWNED))
        .catch(err => this.fail(err));
    });
  });

  describe('makeSclangConfig', function() {
    it('should write a yaml file and resolve with a path', function() {
      var sclang = new SCLang();
      var fail = err => this.fail(err);
      return sclang
        .makeSclangConfig({ includePaths: [], excludePaths: [] })
        .then(tmpPath => expect(tmpPath).toBeTruthy())
        .error(fail);
    });
  });

  describe('sclangConfigOptions', function() {
    it('should include supercollider-js', function() {
      var sclang = new SCLang();
      var config = sclang.sclangConfigOptions();
      expect(config.includePaths.length).toEqual(1);
      expect(config.includePaths[0].match(/supercollider-js/)).toBeTruthy();
    });

    it('postInlineWarning should not be undefined', function() {
      var sclang = new SCLang();
      var config = sclang.sclangConfigOptions({});
      expect(config.postInlineWarning).toBeDefined();

      config = sclang.sclangConfigOptions({ postInlineWarning: undefined });
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
      // don't listen to stdin or tests will hang
      sclang.installListeners(subprocess, false);
    });

    // the test runner jest-cli is getting these and breaking
    // it('should respond to subprocess events', function() {
    //   /**
    //    * TODO needs to be properly mocked
    //    */
    //   var subprocess = new MockProcess();
    //   var sclang = new SCLang();
    //   sclang.setState(STATES.BOOTING);
    //   sclang.installListeners(subprocess, true);
    //
    //   process.stdin.emit('data', '');
    //   subprocess.stdout.emit('data', 'data');
    //   subprocess.stderr.emit('data', 'data');
    //   subprocess.emit('error', 'error');
    //   subprocess.emit('close', 0, 'close');
    //   subprocess.emit('exit', 0, 'exit');
    //   subprocess.emit('disconnect');
    // });
  });

  describe('spawnProcess', function() {
    // mock spawn to return an event emitter
    it('should spawnProcess', function() {
      var sclang = new SCLang();
      spyOn(sclang, '_spawnProcess').and.returnValue({
        pid: 1
      });
      spyOn(sclang, 'installListeners');
      var promise = sclang.spawnProcess('/tmp/fake/path', {});
      expect(promise).toBeTruthy();
    });
  });

  describe('interpret', function() {
    it('should call this.write', function() {
      var sclang = new SCLang();
      spyOn(sclang, 'write').and.returnValue(null);
      sclang.interpret('1 + 1', '/tmp/source.scd');
      expect(sclang.write).toHaveBeenCalled();
    });
  });

  describe('executeFile', function() {
    it('should call this.write', function() {
      var sclang = new SCLang();
      spyOn(sclang, 'write').and.returnValue(null);
      sclang.executeFile('/tmp/source.scd', false, true, true);
      expect(sclang.write).toHaveBeenCalled();
    });
  });

  describe('quit', function() {
    it('should quit silently if not booted', function() {
      var sclang = new SCLang();
      return sclang.quit();
    });

    it('should quit process', function() {
      var sclang = new SCLang();
      sclang.process = new MockProcess();
      spyOn(sclang.process, 'kill').and.returnValue(null);
      var p = sclang.quit().then(() => {
        expect(sclang.process).toEqual(null);
      });
      sclang.process.emit('exit');
      return p;
    });
  });
});
