import Logger from "@supercollider/logger";
import { packMessage, unpackMessage } from "@supercollider/osc";
import cuid from "cuid";
import dgram from "dgram";
import events from "events";
import _ from "lodash";

interface RequestHandler {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}
interface RequestHandlers {
  [guid: string]: RequestHandler;
}

/*
 *  Communicates via OSC with the SuperCollider API quark
 *
 *  The 'API' quark implements a two-way communication protocol.
 *  This nodejs code implements the other end of that communcation.
 *
 *  It connects with an sclang process using UDP OSC
 *  and then sends OSC messages to '/API/call'
 *
 *  Sent messages return a promise,
 *  the responses are received here from sclang
 *  and the promises are resolved
 *  (or rejected if there was an error).
 *
 *  Start SuperCollider
 *  Install the API quark ( > 2.0 )
 *  Activate the OSC responders in supercollider:
 *    API.mountDuplexOSC
 *
 *  See examples/call-api-from-node.js
 */
export default class SCAPI extends events.EventEmitter {
  readonly schost: string;
  readonly scport: number;
  private requests: RequestHandlers = {};
  private log: Logger;
  private udp?: dgram.Socket;

  constructor(schost = "localhost", scport = 57120) {
    super();
    this.schost = schost;
    this.scport = scport;
    this.requests = {};
    this.log = new Logger(true, false);
  }

  connect(): void {
    this.udp = dgram.createSocket("udp4");

    this.udp.on("message", (msgbuf: Buffer) => {
      const msg = unpackMessage(msgbuf);
      if (msg.address === "/API/reply") {
        return this.receive("reply", msg);
      }
      return this.receive("scapi_error", msg);
    });

    this.udp.on("error", e => {
      this.emit("error", e);
      this.log.err("ERROR:" + e);
    });
  }

  disconnect(): void {
    if (this.udp) {
      this.udp.close();
      delete this.udp;
    }
  }

  call(
    requestId: string | undefined,
    oscpath: string,
    args,
    ok?: (value: unknown) => any,
    err?: ((reason: any) => any) | null | undefined,
  ): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      const clientId = 0; // no longer needed
      let clumps: RegExpMatchArray | null = null;

      requestId = _.isUndefined(requestId) ? cuid() : requestId;
      args = args ? args : [];
      if (!_.isString(oscpath)) {
        this.log.err("Bad oscpath" + oscpath);
        throw "Bad oscpath" + oscpath;
      }

      const sender = (rid, oscArgs) => {
        const buf = packMessage({
          address: "/API/call",
          args: [clientId, rid, oscpath].concat(oscArgs),
        });
        this.udp &&
          this.udp.send(buf, 0, buf.length, this.scport, this.schost, err2 => {
            // this will get DNS errors
            // but not packet-too-big errors
            if (err2) {
              this.log.err(err2);
            }
          });
      };

      this.requests[requestId] = { resolve: resolve, reject: reject };

      const isNotOsc = (a: object | string) => {
        // if any arg is an object or array
        // or a large string then pass the args as JSON
        // in multiple calls
        if (typeof a === "string") {
          return a.length > 7168;
        }
        return _.isObject(a) || _.isArray(a);
      };

      if (_.some(args, isNotOsc)) {
        clumps = JSON.stringify(args).match(/.{1,7168}/g);
        _.each(clumps, function(clump, i) {
          if (clumps) {
            const rid = "" + (i + 1) + "," + clumps.length + ":" + requestId;
            sender(rid, [clump]);
          }
        });
      } else {
        sender(requestId, args);
      }
    });
    if (ok) {
      return promise.then(ok, err);
    } else {
      return promise;
    }
  }

  private receive(signal, msg): void {
    const requestId = msg.args[1];
    let result = msg.args[2];
    const request = this.requests[requestId];
    if (!request) {
      this.emit("error", "Unknown request " + requestId);
      this.log.err("Unknown request " + requestId);
      return;
    }

    // reply or scapi_error
    if (signal === "reply") {
      try {
        result = JSON.parse(result);
        result = result.result;
      } catch (e) {
        result = "MALFORMED JSON RESPONSE:" + result;
        this.log.err(result);
        signal = "scapi_error";
      }
    }

    const response = {
      signal: signal,
      request_id: requestId,
      result: result,
    };

    if (signal === "reply") {
      request.resolve(response);
    } else {
      request.reject(new Error(`API Error response ${response}`));
    }
    delete this.requests[requestId];
  }
}
