// jest.autoMockOff();

import Logger from "../";

describe("Logger", function() {
  const l = new Logger(true, false);

  it("dbug", function() {
    l.dbug("testing dbug");
  });

  it("should handle JSON type object", function() {
    l.dbug({ testing: { object: ["dbug", 3] } });
  });
});
