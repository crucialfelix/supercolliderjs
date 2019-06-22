var utils = require('../utils');
import _ from 'lodash';

describe('parseMessage', function() {
  it('should parse a message', function() {
    var msg = {
      address: '/n_go',
      args: [
        { type: 'integer', value: 1000 },
        { type: 'integer', value: 0 },
        { type: 'integer', value: -1 },
        { type: 'integer', value: 3 },
        { type: 'integer', value: 0 }
      ],
      oscType: 'message'
    };
    var p = utils.parseMessage(msg);
    expect(_.isArray(p)).toBe(true);
    expect(p).toEqual(['/n_go', 1000, 0, -1, 3, 0]);
    expect(p.length).toBe(6);
  });
});

describe('makeMessage', function() {
  it('should format a message', function() {
    var msg = utils.makeMessage(['/n_go', 1000, 0, -1, 3, 0]);
    expect(msg).toBeTruthy();
  });
});

describe('makeBundle', function() {
  it('should format a bundle', function() {
    var b = utils.makeBundle(0, [['/n_go', 1000, 0, -1, 3, 0]]);
    expect(b).toBeTruthy();
  });
});

describe('asPacket', function() {
  var address = '/n_go';
  var args = [1000, 0, -1, 3, 0];

  it('should convert one array message to object style', function() {
    var obj = utils.asPacket([address].concat(args));
    expect(_.isObject(obj)).toBe(true);
    expect(obj.address).toBe(address);
    expect(obj.args).toEqual(args);
  });

  it('should convert object to bundle object', function() {
    var bobj = {
      timeTag: 0,
      packets: [[address].concat(args)]
    };
    var obj = utils.asPacket(bobj);
    expect(_.isObject(obj)).toBe(true);
    expect(obj.timetag).toBe(0);
    expect(obj.elements.length).toBe(1);
    expect(obj.elements[0].address).toBe(address);
    expect(obj.elements[0].args).toEqual(args);
  });

  // no, that would be a message
  //
  // it('should map an array to packets', function() {
  //   var packets = [
  //     [address, args]
  //   ];
  //   var objs = _.map(packets, utils.asPacket);
  //   expect(objs.length).toBe(1);
  //   expect(_.isObject(objs[0])).toBe(true);
  //   expect(objs[0].address).toBe(address);
  //   console.log(objs);
  //   expect(objs[0].args).toEqual(args);
  // });
});

describe('timeTag', function() {
  it('should make an NTP timeTag array with no args', function() {
    var ntp = utils.deltaTimeTag();
    expect(_.isArray(ntp)).toBe(true);
    expect(ntp.length).toBe(2);
  });

  it('should make an NTP timeTag array from a number', function() {
    var ntp = utils.deltaTimeTag(100);
    expect(_.isArray(ntp)).toBe(true);
    expect(ntp.length).toBe(2);
  });

  it('should make an NTP timeTag array from a date', function() {
    var ntp = utils.deltaTimeTag(new Date());
    expect(_.isArray(ntp)).toBe(true);
    expect(ntp.length).toBe(2);
  });

  it('should return ntp tag for UTC 1970', function() {
    var epoch = new Date(Date.UTC(1970, 1, 1, 0, 0, 0));
    var ntp = utils.dateToTimetag(epoch);
    expect(ntp).toEqual([2211667200, 0]);
  });
});
