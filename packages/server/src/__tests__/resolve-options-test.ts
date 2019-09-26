import _ from "lodash";
import { resolveOptions } from "../options";

describe("resolveOptions", function() {
  // `pit` is `it` for promises
  it("should get default options with no undefines", function() {
    const opts = resolveOptions();
    _.each(opts, function(val) {
      expect(val).toBeDefined();
    });
  });

  // it("should reject if configPath does not exist", function() {
  //   var badPath = "/---~no-way-do-you-have-this-path-on-your-computer~---/bad/path.yaml";
  //   const opts = resolveOptions(badPath, {});
  //   .then(
  //     () => {
  //       throw new Error("should not have resolved");
  //     },
  //     function(err) {
  //       expect(err.message).toBeTruthy();
  //       expect(err.message).toContain(badPath);
  //     },
  //   );
  // });

  it("should remove undefined values from supplied options", function() {
    const opts = resolveOptions({ scsynth: undefined });

    _.each(opts, function(val) {
      expect(val).toBeDefined();
    });
  });
});
