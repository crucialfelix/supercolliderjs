import { BufferReader, BufferWriter, toDoubleBuffer, toFloatBuffer, toIntegerBuffer, toOscString } from "./buffers";
import { asNTPTimeTag } from "./timetags";
import { BundleOrMessage, OSCBundle, OSCMessage, OscType, OscValues } from "./types";

interface TypeReader {
  type: string;
  read: (buffer: BufferReader) => OscType;
  toArg: Function;
}
interface TypeReaders {
  [typeChar: string]: TypeReader;
}

const oscTypeReaders: TypeReaders = {
  s: {
    type: "string",
    read: function(buffer: BufferReader): string {
      return buffer.readString();
    },
    toArg: function(value: string): Buffer {
      return toOscString(value);
    },
  },
  i: {
    type: "integer",
    read: function(buffer: BufferReader): number {
      return buffer.readInt32();
    },
    toArg: function(value: number): Buffer {
      return toIntegerBuffer(value);
    },
  },
  // does anything send this in a message?
  // sclang supports this inbound but the scsynth never sends it
  // t: {
  //   type: "timetag",
  //   read: function(buffer: BufferReader): NTPTimeTag {
  //     return buffer.readTimetag();
  //   },
  //   toArg: function(value: OSCTimeType): Buffer {
  //     return toTimetagBuffer(value);
  //   },
  // },
  f: {
    type: "float",
    read: function(buffer: BufferReader): number {
      return buffer.readFloat32();
    },
    toArg: function(value: number): Buffer {
      return toFloatBuffer(value);
    },
  },
  d: {
    type: "double",
    read: function(buffer: BufferReader): number {
      return buffer.readDouble();
    },
    toArg: function(value: number): Buffer {
      return toDoubleBuffer(value);
    },
  },
  b: {
    type: "blob",
    read: function(buffer: BufferReader): Buffer {
      return buffer.readBuffer();
    },
    toArg: function(value: Buffer): Buffer {
      // An int32 size count, followed by that many 8-bit bytes of arbitrary binary data, followed by 0-3 additional zero bytes to make the total number of bits a multiple of 32.
      const size = toIntegerBuffer(value.length);
      return Buffer.concat([size, value]);
    },
  },
  T: {
    type: "true",
    read: function(buffer: BufferReader): true {
      return true;
    },
    toArg: function(value: true): Buffer {
      return Buffer.alloc(0);
    },
  },
  F: {
    type: "false",
    read: function(buffer: BufferReader): false {
      return false;
    },
    toArg: function(value: false): Buffer {
      return Buffer.alloc(0);
    },
  },
  N: {
    type: "null",
    read: function(buffer: BufferReader): null {
      return null;
    },
    toArg: function(value: null): Buffer {
      return Buffer.alloc(0);
    },
  },
  // I: {
  //   type: "inf",
  //   read: function(buffer: BufferReader): Infinity {
  //     return Infinity;
  //   },
  //   toArg: function(value: Infinity): Buffer {
  //     return Buffer.alloc(0);
  //   },
  // },
};

type TypeCodesLookup = { [key: string]: string };
// reverse lookup dict
const oscTypeCodesForType: TypeCodesLookup = (function(): TypeCodesLookup {
  const r: TypeCodesLookup = {};
  Object.entries(oscTypeReaders).forEach(([key, value]) => {
    r[value.type] = key;
  });
  return r;
})();

function typeCodeForTypeString(typeString: string): string {
  return oscTypeCodesForType[typeString];
}

function typeStringForTypeCode(typeCode: string): string {
  return oscTypeReaders[typeCode].type;
}

function typeCodeForArg(arg: OscType): string {
  switch (typeof arg) {
    case "string":
      return "s";
    case "number":
      // All numbers defaults to float
      return "f";
    case "boolean":
      return arg ? "T" : "F";
    default:
      if (arg === null) {
        return "N";
      }
      if (Buffer.isBuffer(arg)) {
        return "b";
      }
      throw new Error(`Unsupported OSC Type ${typeof arg} ${arg}`);
  }
}

function oscTypeAsBuffer(value: OscType, type: string): Buffer {
  const osctype = typeCodeForTypeString(type);
  if (osctype) {
    // could write directly to a buffer
    return oscTypeReaders[osctype].toArg(value);
  } else {
    throw new Error(`OSC Cannot send unsupported type: ${type}`);
  }
}

function readOSCMessage(buffer: BufferReader): OSCMessage {
  const address = buffer.readString();

  if (buffer.ended()) {
    return {
      address: address,
      args: [],
      oscType: "message",
    };
  }
  const types = buffer.readString();

  // characters indicate the types of each argument
  const args: OscValues = [];

  for (let index = 0; index < types.length; index++) {
    const typeChar = types[index];
    if (index === 0) {
      if (typeChar !== ",") {
        throw new Error("Argument lists must begin with ,");
      }
    } else {
      // read type
      const tr = oscTypeReaders[typeChar];

      if (!tr) {
        throw new Error(`Unhandled OSC type ${typeChar}`);
      }
      // could return a timetag [number, number]
      // but actually wouldn't
      const value = tr.read(buffer);

      args.push(value);
    }
  }

  return {
    address: address,
    args,
    oscType: "message",
  };
}

function readOSCBundle(buffer: BufferReader): OSCBundle {
  const bundleTag = buffer.readString(false);
  if (bundleTag !== "#bundle") {
    throw new Error("osc-bundles must begin with #bundle");
  } else {
    // consume it
    buffer.readString(true);
  }
  const timetag = buffer.readTimetag();

  const convertedElems = readBundleElements(buffer);
  return {
    timetag: timetag,
    // packets?
    elements: convertedElems,
    oscType: "bundle",
  };
}

function readOSCPacket(buffer: BufferReader): BundleOrMessage {
  if (isOscBundleBuffer(buffer)) {
    return readOSCBundle(buffer);
  } else {
    return readOSCMessage(buffer);
  }
}

// const getArrayArg = (arg: OscType): Array<OscType> | null => {
//   if (Array.isArray(arg)) {
//     return arg;
//   }
//   return null;
// };

function buildMessageArgs(argList: OscValues): [string, Buffer[]] {
  let oscTypes = "";
  const oscArgs: Buffer[] = [];

  argList.forEach(arg => {
    const typeCode = typeCodeForArg(arg);
    const buff = oscTypeAsBuffer(arg, typeStringForTypeCode(typeCode));
    oscArgs.push(buff);
    oscTypes += typeCode;
  });

  return [oscTypes, oscArgs];
}

export function packMessage(message: OSCMessage): Buffer {
  const address = message.address;
  const args = message.args || [];

  const [oscTypes, oscArgs] = buildMessageArgs(args);

  const buffer = new BufferWriter();
  buffer.writeString(address);
  buffer.writeString("," + oscTypes);
  oscArgs.forEach(oa => {
    buffer.insertBuffer(oa);
  });

  return buffer.crop();
}

export function packBundle(bundle: OSCBundle): Buffer {
  const buffer = new BufferWriter();
  buffer.writeString("#bundle");
  buffer.writeTimetag(asNTPTimeTag(bundle.timetag));
  bundle.elements.forEach(elem => {
    const buff = packElement(elem);
    buffer.writeBuffer(buff);
  });
  return buffer.crop();
}

function packElement(bundleOrMessage: BundleOrMessage): Buffer {
  switch (bundleOrMessage.oscType) {
    case "bundle":
      return packBundle(bundleOrMessage as OSCBundle);
    case "message":
      return packMessage(bundleOrMessage as OSCMessage);
    default:
      if ("timetag" in bundleOrMessage) {
        return packBundle(bundleOrMessage as OSCBundle);
      }
      if ("address" in bundleOrMessage) {
        return packMessage(bundleOrMessage as OSCMessage);
      }

      throw new Error(`Unmatched oscType (message|bundle) ${JSON.stringify(bundleOrMessage)}`);
  }
}

function isOscBundleBuffer(buffer: BufferReader): boolean {
  // read string at but do not advance cursor
  return buffer.readString(false) === "#bundle";
}

/**
 * map each item in buffer with a function
 */
function readBundleElements(buffer: BufferReader): BundleOrMessage[] {
  const results: BundleOrMessage[] = [];
  while (!buffer.ended()) {
    // is it readBuffer? that implies it has a start size
    const packetBuffer = new BufferReader(buffer.readBuffer());
    if (!packetBuffer.ended()) {
      const elem = readOSCPacket(packetBuffer);
      // what if it doesn't advance offset ?
      if (elem) {
        results.push(elem);
      }
    }
  }
  return results;
}

/**
 * Unpacks either an OSCMessage or OSCBundle from an OSC Packet
 * It's a bundle if it starts with `#bundle`
 */
export function unpack(buffer: Buffer): BundleOrMessage {
  return readOSCPacket(new BufferReader(buffer));
}

export function unpackMessage(buffer: Buffer): OSCMessage {
  return readOSCMessage(new BufferReader(buffer));
}

export function unpackBundle(buffer: Buffer): OSCBundle {
  return readOSCBundle(new BufferReader(buffer));
}

/**
 * Encodes an OSCMessage or OSCBundle to a Buffer
 */
export function pack(msgOrBundle: BundleOrMessage): Buffer {
  return packElement(msgOrBundle);
}
