import { asNTPTimeTag } from "./timetags";
import { NTPTimeTag, OSCTimeType } from "./types";

const NULL = "\u0000";
const SIZEOF_INT32 = Int32Array.BYTES_PER_ELEMENT;
const SIZEOF_UINT32 = Uint32Array.BYTES_PER_ELEMENT;
// const SIZEOF_INT64 = UInt64Array;
const SIZEOF_FLOAT = Float32Array.BYTES_PER_ELEMENT;
const SIZEOF_DOUBLE = Float64Array.BYTES_PER_ELEMENT;

/**
 * Holds a Buffer and reads values, moving the offset.
 */
export class BufferReader {
  buffer: Buffer;
  private offset = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  readString(consume = true): string {
    // const strLength = this.readInt32();
    const rawStr = this.buffer.toString("utf8", this.offset);
    const nullIndex = rawStr.indexOf(NULL);
    if (nullIndex === -1) {
      throw new Error(`Unable to find string NULL terminator: ${rawStr}`);
    }

    const str = rawStr.slice(0, nullIndex);

    // if (str.length !== strLength) {
    //   // 0 !== 1065353216
    //   throw new Error(`Str length is wrong ${str.length} !== ${strLength}`);
    // }
    if (consume) {
      // consume size of string plus the expected padding
      // TODO should verify that the remaining characters are NULLS
      // sent from scsynth
      const plus = Buffer.byteLength(str) + padStringBy(str);
      this.offset += plus;
    }
    return str;
  }
  readInt32(): number {
    const v = this.buffer.readInt32BE(this.offset);
    this.offset += SIZEOF_INT32;
    return v;
  }
  readUInt32(): number {
    const v = this.buffer.readUInt32BE(this.offset);
    this.offset += SIZEOF_UINT32;
    return v;
  }
  readFloat32(): number {
    const v = this.buffer.readFloatBE(this.offset);
    this.offset += SIZEOF_FLOAT;
    return v;
  }
  readDouble(): number {
    const v = this.buffer.readDoubleBE(this.offset);
    this.offset += SIZEOF_DOUBLE;
    return v;
  }
  readBuffer(): Buffer {
    const length = this.readInt32();
    const b = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return b;
  }
  readTimetag(): NTPTimeTag {
    const seconds = this.readUInt32();
    const fractional = this.readUInt32();
    return [seconds, fractional];
  }

  ended(): boolean {
    return this.offset >= this.buffer.length;
  }
}

export class BufferWriter {
  buffer: Buffer;
  private offset = 0;

  constructor() {
    this.buffer = Buffer.alloc(1024);
  }
  grow(bytes: number): void {
    const newSize = this.offset + bytes + 256;
    if (newSize > this.buffer.length) {
      this.buffer = Buffer.concat([this.buffer, Buffer.alloc(newSize - this.buffer.length)]);
    }
  }
  inc(bytes: number): void {
    this.offset += bytes;
    // TODO if it's within 1024 of length then alloc new and concat
  }
  crop(): Buffer {
    // Buffer slice returns a view, does not require copying
    return this.buffer.slice(0, this.offset);
  }

  writeString(str: string): void {
    let ss = str;

    const p = padStringBy(str);
    for (let index = 0; index < p; index++) {
      ss += NULL;
    }

    const length = Buffer.byteLength(ss);

    this.grow(length);

    this.buffer.write(ss, this.offset, length);
    this.offset += length;
  }
  /**
   * 32-bit big-endian two's complement integer
   * @param value
   */
  writeInt32(value: number): void {
    // if (value > 2 ** 31) {
    //   throw new Error(`Number out of Int32 range ${value}`);
    // }
    this.buffer.writeInt32BE(value, this.offset);
    this.offset += SIZEOF_INT32;
  }
  writeUInt32(value: number): void {
    this.buffer.writeUInt32BE(value, this.offset);
    this.offset += SIZEOF_UINT32;
  }
  /**
   * 32-bit big-endian IEEE 754 floating point number
   */
  writeFloat32(value: number): void {
    this.buffer.writeFloatBE(value, this.offset);
    this.offset += SIZEOF_FLOAT;
  }
  writeDouble(value: number): void {
    this.buffer.writeDoubleBE(value, this.offset);
    this.offset += SIZEOF_DOUBLE;
  }
  writeBuffer(data: Buffer): void {
    const size = data.byteLength;
    this.writeInt32(size);
    this.buffer = Buffer.concat([this.crop(), data, Buffer.alloc(256)]);
    this.offset += size;
  }
  insertBuffer(data: Buffer): void {
    const size = data.byteLength;
    this.buffer = Buffer.concat([this.crop(), data, Buffer.alloc(256)]);
    this.offset += size;
  }
  /**
   * 64-bit big-endian fixed-point time tag
   * @param timetag
   */
  writeTimetag(timetag: NTPTimeTag): void {
    this.writeUInt32(timetag[0]);
    this.writeUInt32(timetag[1]);
  }
}

/**
 * A sequence of non-null ASCII characters followed by a null, followed by 0-3 additional null characters to make the total number of bits a multiple of 32. (OSC-string examples) In this document, example OSC-strings will be written without the null characters, surrounded by double quotes.
 */
export const padString = (str: string): string => {
  if (str.indexOf(NULL) !== -1) {
    throw new Error("Cannot encode a string that contains a NULL");
  }

  let body = str;

  // osc-strings must have length divisible by 4 and end with at least one zero.
  const end = padStringBy(body);
  for (let index = 0; index < end; index++) {
    body += NULL;
  }
  return body;
};
export const toOscString = (str: string): Buffer => {
  return Buffer.from(padString(str));
};

const padStringBy = (str: string): number => {
  // string should have at least one null
  // and should be a multiple of 4
  return 4 - (Buffer.byteLength(str) % 4);
};

export const toTimetagBuffer = (timetag: OSCTimeType): Buffer => {
  const tt = asNTPTimeTag(timetag);
  return Buffer.from(Uint32Array.from(tt));
};

export const toIntegerBuffer = (number: number): Buffer => {
  const buffer = Buffer.alloc(SIZEOF_INT32);
  buffer.writeInt32BE(number, 0);
  return buffer;
};

export const toFloatBuffer = (number: number): Buffer => {
  const buffer = Buffer.alloc(SIZEOF_FLOAT);
  buffer.writeFloatBE(number, 0);
  return buffer;
};

export const toDoubleBuffer = (number: number): Buffer => {
  const buffer = Buffer.alloc(SIZEOF_DOUBLE);
  buffer.writeDoubleBE(number, 0);
  return buffer;
};
