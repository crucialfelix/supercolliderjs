const { asNTPTimeTag, deltaTimeTag } = require("../lib/timetags");

const SECONDS_FROM_1900_to_1970 = 2208988800;

describe("@supercollider/osc", () => {
  describe("asNTPTimeTag", () => {
    it("NTP epoch", () => {
      const d = new Date(Date.UTC(1970, 0));
      const tt = asNTPTimeTag(d);
      expect(tt).toEqual([SECONDS_FROM_1900_to_1970, 0]);
    });

    it("should convert a number", () => {
      const d = Date.UTC(1970, 0) / 1000;
      const tt = asNTPTimeTag(d);
      expect(tt).toEqual([SECONDS_FROM_1900_to_1970, 0]);
    });
    it("should convert a Date", () => {
      const d = new Date(Date.UTC(1970, 0));
      const tt = asNTPTimeTag(d);
      expect(tt).toEqual([SECONDS_FROM_1900_to_1970, 0]);
    });

    it("should pass a time tag through", () => {
      const d = [1, 1];
      const tt = asNTPTimeTag(d);
      expect(tt).toEqual(d);
    });

    it("should make time tag from undefined (now)", () => {
      const tt = asNTPTimeTag();
      expect(tt.length).toEqual(2);
    });

    it("should make time tag from null (now)", () => {
      const tt = asNTPTimeTag(null);
      expect(tt.length).toEqual(2);
    });
  });

  describe("deltaTimeTag", () => {
    it("should make an NTP timetag array from a number", function() {
      const ntp = deltaTimeTag(100);
      expect(Array.isArray(ntp)).toBe(true);
      expect(ntp.length).toBe(2);
    });

    it("should make an NTP timetag array from a date", function() {
      const ntp = deltaTimeTag(new Date());
      expect(Array.isArray(ntp)).toBe(true);
      expect(ntp.length).toBe(2);
    });
  });
});
