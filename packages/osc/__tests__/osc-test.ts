const { packMessage, packBundle, unpackMessage, unpackBundle } = require("../lib/packing");

const { BufferReader, BufferWriter, padString } = require("../lib/buffers");
const timetags = require("../lib/timetags");

const msg = {
  address: "/address",
  args: [1, "hello", true],
  oscType: "message",
};

const msg2 = {
  address: "/address",
  args: [0.1, 0.2],
  oscType: "message",
};

const bundle = {
  timetag: timetags.asNTPTimeTag(new Date()),
  elements: [msg],
  oscType: "bundle",
};

describe("@supercollider/osc", () => {
  describe("Should Pack+Unpack", () => {
    it("OSCMessage msg", () => {
      const b = packMessage(msg);
      expect(b).toBeTruthy();
      const m = unpackMessage(b);
      expect(m).toEqual(msg);
    });

    it("OSCMessage msg2", () => {
      const b = packMessage(msg2);
      expect(b).toBeTruthy();
      const m = unpackMessage(b);
      expect(m).toEqual(msg2);
    });

    it("OSCBundle", () => {
      const b = packBundle(bundle);
      expect(b).toBeTruthy();
      const m = unpackBundle(b);
      expect(m).toEqual(bundle);
    });
  });

  describe("Buffer Reader/Writer", () => {
    it("Should pad strings", () => {
      const NULL = "\u0000";

      const testString = (str, length) => {
        const ps = padString(str);
        expect(ps.length).toEqual(length);
        // should always be a multiple of 32 bits / 4 bytes
        expect(ps.length % 4).toEqual(0);
        // should always have at least one NULL
        expect(ps.indexOf(NULL)).not.toEqual(-1);
      };

      testString("abc", 4);
      testString("abcd", 8);
      testString("abcde", 8);
      testString("abcdef", 8);
      testString("abcdefg", 8);
    });

    describe("Should read/write", () => {
      it("string", () => {
        const hello = "hello";
        const answer = 42;
        const bw = new BufferWriter();
        bw.writeString(hello);
        bw.writeInt32(answer);

        const br = new BufferReader(bw.crop());
        expect(br.readString()).toEqual(hello);
        expect(br.readInt32()).toEqual(answer);
      });

      it("string larger than initial buffer size", () => {
        // greater than initial buffer allocation
        const hello =
          "ipsumEx est aliquip excepteur fugiat nostrud Lorem aliquip culpa. Esse nulla tempor aliqua occaecat commodo sit. Nisi commodo anim est ipsum elit nulla reprehenderit sunt nisi ut exercitation voluptate consequat voluptate.Reprehenderit minim laboris dolore anim esse. Exercitation ad exercitation commodo ea fugiat dolor ullamco minim et quis officia esse fugiat. Cillum esse mollit ut aute reprehenderit eiusmod.Labore ea fugiat duis laboris in ea id minim reprehenderit eiusmod velit cupidatat. Occaecat voluptate nostrud sunt eiusmod enim non et. Laboris excepteur nostrud quis cillum amet nulla amet veniam magna.Dolore consectetur aliquip veniam excepteur. Dolor cillum tempor deserunt ea fugiat minim. Velit aute Lorem officia esse. Consectetur mollit ullamco dolore nostrud in ad do velit ut reprehenderit. Sunt est do id dolore sit mollit ea excepteur cillum id aliquip culpa. Duis ea anim eiusmod aliquip nisi magna consectetur cillum fugiat est. Id nulla ullamco exercitation ex in dolore eiusmod et pariatur culpa proident laborum.";

        const bw = new BufferWriter();
        bw.writeString(hello);

        const br = new BufferReader(bw.crop());
        expect(br.readString()).toEqual(hello);
      });

      it("int32", () => {
        const bw = new BufferWriter();
        bw.writeInt32(42);

        const br = new BufferReader(bw.crop());
        expect(br.readInt32()).toEqual(42);
      });

      it("float32", () => {
        const v = 0.11;
        const bw = new BufferWriter();
        bw.writeFloat32(v);

        const br = new BufferReader(bw.crop());
        expect(br.readFloat32()).toBeCloseTo(v);
      });
      it("double 0.11", () => {
        const v = 0.11;
        const bw = new BufferWriter();
        bw.writeDouble(v);

        const br = new BufferReader(bw.crop());
        expect(br.readDouble()).toBeCloseTo(v);
      });
      it("double 1", () => {
        const v = 1;
        const bw = new BufferWriter();
        bw.writeDouble(v);

        const br = new BufferReader(bw.crop());
        expect(br.readDouble()).toBeCloseTo(v);
      });

      it("buffer", () => {
        const v = "buffer string";
        const b = Buffer.from(v);
        const bw = new BufferWriter();
        bw.writeBuffer(b);

        const br = new BufferReader(bw.crop());
        const vv = br.readBuffer();
        expect(vv.toString()).toEqual(v);
      });
      it("timetag", () => {
        const tt = timetags.asNTPTimeTag(new Date());
        const bw = new BufferWriter();
        bw.writeTimetag(tt);

        const br = new BufferReader(bw.crop());
        const vv = br.readTimetag();
        expect(vv).toEqual(tt);
      });
    });
  });
});
