/* @flow */

// https://nodejs.org/api/net.html#net_class_net_socket
declare class Socket {
  on(eventName: string, fn: Function): void;
  send(buf: any, start: number, end: number, port: number, host: string): void;
  close(): void;
}

// node
declare module dgram {
  declare function createSocket(type: string): Socket;
}
