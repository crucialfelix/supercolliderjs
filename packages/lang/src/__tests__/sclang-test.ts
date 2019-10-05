import { ChildProcess } from "child_process";
import { EventEmitter } from "events";
import fs from "fs";
import _ from "lodash";
import path from "path";

import SCLang from "../sclang";

// import {State} from '../internals/sclang-io';
class MockProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
  }
  kill() {}
}

describe("sclang", function() {
  describe("default constructor", function() {
    it("should exist", function() {
      const sclang = new SCLang();
      expect(sclang).toBeDefined();
    });
  });

  const checkQuarkPath = (includePaths: string[]): boolean =>
    _.some(includePaths, function(p) {
      // and that directory should really exist
      return p.match(/supercollider-js$/) && fs.statSync(p);
    });

  describe("sclangConfigOptions", function() {
    it("should include supercollider-js", function() {
      const sclang = new SCLang();
      const opts = sclang.sclangConfigOptions(sclang.options);
      expect(checkQuarkPath(opts.includePaths)).toBeTruthy();
    });

    it("should read a supplied sclang_conf", function() {
      const sclang = new SCLang({
        sclang_conf: path.join(__dirname, "fixtures", "sclang_test_conf.yaml"),
      });
      const opts = sclang.sclangConfigOptions(sclang.options);
      expect(checkQuarkPath(opts.includePaths)).toBeTruthy();
      // 2 includes + supercollider-js
      expect(opts.includePaths.length).toEqual(2 + 1);
      expect(opts.excludePaths.length).toEqual(1);
    });

    it("should merge sclang_conf with supplied includePaths", function() {
      const sclang = new SCLang({
        sclang_conf: path.join(__dirname, "fixtures", "sclang_test_conf.yaml"),
        conf: {
          includePaths: ["/custom/one", "/path/include/one"],
          excludePaths: ["/custom/two"],
          postInlineWarnings: true,
        },
      });
      const opts = sclang.sclangConfigOptions(sclang.options);
      expect(opts.includePaths.length).toEqual(3 + 1);
      expect(opts.excludePaths.length).toEqual(2);
    });
  });

  describe("args", function() {
    it("should format args correctly", function() {
      const sclang = new SCLang();
      const args = sclang.args({ langPort: 4 });
      // [ '-i', 'supercolliderjs', '-u', '4' ]
      expect(args.length).toEqual(4);
      expect(args[3]).toEqual("4");
    });
  });

  describe("boot", function() {
    it("should call spawnProcess", function() {
      const sclang = new SCLang();
      const SPAWNED = "SPAWNED";
      spyOn(sclang, "spawnProcess").and.returnValue(SPAWNED);
      return sclang
        .boot()
        .then(result => expect(result).toEqual(SPAWNED))
        .catch(err => {
          throw err;
        });
    });
  });

  describe("makeSclangConfig", function() {
    it("should write a yaml file and resolve with a path", function() {
      const sclang = new SCLang({ conf: { includePaths: [], excludePaths: [], postInlineWarnings: false } });
      return sclang
        .makeSclangConfig(sclang.options.conf)
        .then(tmpPath => expect(tmpPath).toBeTruthy())
        .catch(err => {
          throw err;
        });
    });
  });

  describe("sclangConfigOptions", function() {
    it("should include supercollider-js", function() {
      const sclang = new SCLang();
      const config = sclang.sclangConfigOptions(sclang.options);
      expect(checkQuarkPath(config.includePaths)).toBeTruthy();
    });

    // not really possible now
    it("postInlineWarning should not be undefined", function() {
      const sclang = new SCLang();
      const config = sclang.sclangConfigOptions(sclang.options);
      expect(config.postInlineWarnings).toBeDefined();
    });
  });

  describe("makeStateWatcher", function() {
    it("should echo events from SclangIO to SCLang", function() {
      const sclang = new SCLang();
      let did = false;
      const stateWatcher = sclang.makeStateWatcher();
      sclang.on("state", () => {
        did = true;
      });
      stateWatcher.emit("state", "READY");
      expect(did).toEqual(true);
    });
  });

  describe("installListeners", function() {
    it("should install event listeners", function() {
      const subprocess = new MockProcess();
      const sclang = new SCLang();
      // don't listen to stdin or tests will hang
      sclang.installListeners(subprocess as ChildProcess, false);
    });

    // the test runner jest-cli is getting these and breaking
    // it('should respond to subprocess events', function() {
    //   /**
    //    * TODO needs to be properly mocked
    //    */
    //   var subprocess = new MockProcess();
    //   var sclang = new SCLang();
    //   sclang.setState(State.BOOTING);
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

  describe("spawnProcess", function() {
    // mock spawn to return an event emitter
    it("should spawnProcess", function() {
      const sclang = new SCLang();
      spyOn(sclang, "_spawnProcess").and.returnValue({
        pid: 1,
      });
      spyOn(sclang, "installListeners");
      const promise = sclang.spawnProcess("/tmp/fake/path", {});
      expect(promise).toBeTruthy();
    });
  });

  describe("interpret", function() {
    it("should call this.write", function() {
      const sclang = new SCLang();
      spyOn(sclang, "write").and.returnValue(null);
      sclang.interpret("1 + 1", "/tmp/source.scd");
      expect(sclang.write).toHaveBeenCalled();
    });
  });

  describe("executeFile", function() {
    it("should call this.write", function() {
      const sclang = new SCLang();
      spyOn(sclang, "write").and.returnValue(null);
      sclang.executeFile("/tmp/source.scd");
      expect(sclang.write).toHaveBeenCalled();
    });
  });

  describe("quit", function() {
    it("should quit silently if not booted", function() {
      const sclang = new SCLang();
      return sclang.quit();
    });

    it("should quit process", function() {
      const sclang = new SCLang();
      const process = new MockProcess();
      sclang.process = process as ChildProcess;
      spyOn(sclang.process, "kill").and.returnValue(null);
      const p = sclang.quit().then(() => {
        expect(sclang.process).toEqual(undefined);
      });
      sclang.process.emit("exit");
      return p;
    });
  });
});
