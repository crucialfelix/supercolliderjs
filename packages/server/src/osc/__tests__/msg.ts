import * as msg from "../msg";
import _ from "lodash";
// import { CallAndResponse } from "../../osc-types";

describe("msg", function() {
  it("should evaluate each one without error", function() {
    _.each(msg, function(value) {
      // if (typeof value === 'function') {
      // var result = value();
      // if (_.isArray(result)) {
      //   expect(_.isArray(result)).toBeTruthy();
      // } else if (_.isObject(result)) {
      //   let r = result as CallAndResponse;
      //   expect(r.call).toBeDefined();
      //   expect(r.response).toBeDefined();
      // } else {
      //   fail("wrong type:" + result);
      // }
      // }
    });
  });
});
