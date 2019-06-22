export type JSONType =
  | string
  | number
  | boolean
  | null
  | JSONObjectType
  | JSONArrayType;
export type JSONObjectType = { [key: string]: JSONType };
export type JSONArrayType = Array<JSONType>;

// @typedef
export type SclangResultType = JSONType;

export type SynthDefResultType = {
  name: string,
  bytes: Buffer,
  synthDesc: JSONObjectType
};
export type SynthDefResultMapType = { [defName: string]: SynthDefResultType };

// @typedef
export type OscType = string | number | Buffer | null;
// @typedef
export type MsgType = [OscType];
// @typedef
export type CallAndResponseType = { call: MsgType, response: MsgType };
// @typedef
export type PairsType = Array<MsgType> | Object;
// @typedef
export type OSCTimeType = null | number | [number] | Date;
// @typedef
export type OSCMinMsgType = { oscType: string, address: string, args: MsgType };

// @typedef
export type NodeStateType = {
  parent: ?number,
  previous: ?number,
  next: ?number,
  isGroup: boolean,
  head: ?number,
  tail: ?number
};

// @typedef
export type ServerOptions = {
  host: ?string,
  serverPort: ?string,
  protocol: ?string,

  commandLineOptions: ?Array<string>,

  numPrivateAudioBusChannels: ?number,
  numAudioBusChannels: ?number,
  numControlBusChannels: ?number,
  numInputBusChannels: ?number,
  numOutputBusChannels: ?number,
  numBuffers: ?number,

  maxNodes: ?number,
  maxSynthDefs: ?number,
  blockSize: ?number,
  hardwareBufferSize: ?number,

  memSize: ?number,
  numRGens: ?number,
  numWireBufs: ?number,

  sampleRate: ?number,
  loadDefs: ?boolean,

  inputStreamsEnabled: ?boolean,
  outputStreamsEnabled: ?boolean,

  device: ?string,

  verbosity: ?number,
  zeroConf: ?boolean,

  restrictedPath: ?string,
  ugenPluginsPath: ?string,

  initialNodeID: ?number,
  remoteControlVolume: ?boolean,

  memoryLocking: ?boolean,
  threads: ?boolean,
  useSystemClock: ?boolean,

  // Environment variables to set for server process
  // eg. SC_JACK_DEFAULT_INPUTS: "system:capture_1,system:capture_2"
  env: ?Object
};
