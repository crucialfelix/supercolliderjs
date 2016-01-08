
jest.dontMock('../utils');
jest.dontMock('osc-min');
var utils = require('../utils');
var _ = require('underscore');

describe('parseMessage', function() {
  it('should parse a message', function() {
    var msg = {
      address: '/n_go',
      args: [
         {type: 'integer', value: 1000},
         {type: 'integer', value: 0},
         {type: 'integer', value: -1},
         {type: 'integer', value: 3},
         {type: 'integer', value: 0}
      ],
      oscType: 'message'
    };
    var p = utils.parseMessage(msg);
    expect(_.isArray(p)).toBe(true);
    expect(p.length).toBe(6);
  });
});


describe('messageToBuffer', function() {
  it('should make a buffer', function() {
    var buf = utils.messageToBuffer('/n_go', [1000, 0, -1, 3, 0]);
    expect(buf).toBeTruthy();
  });
});


describe('bundleToBuffer', function() {
  it('should make a buffer', function() {
    var buf = utils.bundleToBuffer(0, [
      ['/n_go', [1000, 0, -1, 3, 0]]
    ]);
    expect(buf).toBeTruthy();
  });

  it('should make a buffer even with no args', function() {
    var buf = utils.bundleToBuffer(0, [
      ['/status']
    ]);
    expect(buf).toBeTruthy();
  });
});

describe('asPacket', function() {
  var address = '/n_go';
  var args = [1000, 0, -1, 3, 0];

  it('should convert one array message to object style', function() {
    var obj = utils.asPacket([address, args]);
    expect(_.isObject(obj)).toBe(true);
    expect(obj.address).toBe(address);
    expect(obj.args).toBe(args);
  });

  it('should convert object to bundle object', function() {
    var bobj = {
      timeTag: 0,
      packets: [
        [address, args]
      ]
    };
    var obj = utils.asPacket(bobj);
    expect(_.isObject(obj)).toBe(true);
    expect(obj.timeTag).toBeTruthy();
    expect(obj.packets.length).toBe(1);
    expect(obj.packets[0].address).toBe(address);
    expect(obj.packets[0].args).toBe(args);
  });

  it('should map an array to packets', function() {
    var packets = [
      [address, args]
    ];
    var objs = _.map(packets, utils.asPacket);
    expect(objs.length).toBe(1);
    expect(_.isObject(objs[0])).toBe(true);
    expect(objs[0].address).toBe(address);
    expect(objs[0].args).toBe(args);
  });

});


describe('timeTag', function() {
  it('should make an NTP timeTag array with no args', function() {
    var ntp = utils.timeTag();
    expect(_.isNumber(ntp)).toBe(true);
    // expect(_.isArray(ntp)).toBe(true);
    // expect(ntp.length).toBe(2);
  });

  it('should make an NTP timeTag array from a number', function() {
    var ntp = utils.timeTag(100);
    expect(_.isNumber(ntp)).toBe(true);
    // expect(_.isArray(ntp)).toBe(true);
    // expect(ntp.length).toBe(2);
  });

  it('should make an NTP timeTag array from a date', function() {
    var ntp = utils.timeTag(new Date());
    expect(_.isNumber(ntp)).toBe(true);
    // expect(_.isArray(ntp)).toBe(true);
    // expect(ntp.length).toBe(2);
  });

  it('should return 0 for UTC 1970', function() {
    var epoch = new Date(1970, 1, 1, 0, 0, 0, 0);
    var ntp = utils.timeTag(epoch);
    expect(ntp).toBe(0);
  });

});
