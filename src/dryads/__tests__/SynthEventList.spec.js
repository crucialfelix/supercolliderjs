
jest.dontMock('../SynthEventList');
var SynthEventList = require('../SynthEventList').default;
var _ = require('underscore');
var timetagToDate = require('../../server/osc/utils').timetagToDate;

describe('SynthEventList', function() {
  describe('_schedEvents', function() {
    let events = [
      {defName: 'blip', args: {freq: 440}, time: 1.0}
    ];
    let sel = new SynthEventList();
    let now = _.now();
    let scheded = sel._schedEvents(events, {group: 0, out: 0}, now);
    let first = scheded[0];

    it('should have events in the packet', function() {
      expect(scheded.length).toEqual(1);
    });
    it('should have a time array', function() {
      expect(_.isArray(first.time)).toBe(true);
    });
    it('should have time 1 second past the supplied epoch of "now"', function() {
      let date = timetagToDate(first.time).getTime();
      let diff = date - now;
      // within 1 millisecond of 1000
      let close = Math.abs(diff - 1000);
      expect(close < 2).toBe(true);
    });

    it('should have a packets array', function() {
      expect(_.isArray(first.packets)).toBe(true);
      expect(_.isArray(first.packets[0])).toBe(true);
    });
  });
});
