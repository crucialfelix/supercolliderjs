import _ from "lodash";

import * as utils from "../utils";

describe("parseMessage", function() {
  it("should parse a message", function() {
    const msg = {
      address: "/n_go",
      // this may be how osc min responds
      // in which case MsgType is wrong
      args: [1000, 0, -1, 3, 0],
      oscType: "message",
    };
    const p = utils.parseMessage(msg);
    expect(_.isArray(p)).toBe(true);
    expect(p).toEqual(["/n_go", 1000, 0, -1, 3, 0]);
    expect(p.length).toBe(6);
  });
});

describe("makeMessage", function() {
  it("should format a message", function() {
    const msg = utils.makeMessage(["/n_go", 1000, 0, -1, 3, 0]);
    expect(msg).toBeTruthy();
  });
});

describe("makeBundle", function() {
  it("should format a bundle", function() {
    const b = utils.makeBundle(0, [["/n_go", 1000, 0, -1, 3, 0]]);
    expect(b).toBeTruthy();
  });
});

describe("asPacket", function() {
  const address = "/n_go";
  const args = [1000, 0, -1, 3, 0];

  it("should convert one array message to object style", function() {
    const obj = utils.asPacket([address, ...args]);
    expect(_.isObject(obj)).toBe(true);
    expect(obj.address).toBe(address);
    expect(obj.args).toEqual(args);
  });

  // it("should convert object to bundle object", function() {
  //   var bobj = {
  //     timetag: 0,
  //     packets: [[address, ...args]],
  //   };
  //   var obj = utils.asPacket(bobj);
  //   expect(_.isObject(obj)).toBe(true);
  //   expect(obj.timetag).toBe(0);
  //   expect(obj.elements.length).toBe(1);
  //   expect(obj.elements[0].address).toBe(address);
  //   expect(obj.elements[0].args).toEqual(args);
  // });

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
