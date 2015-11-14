
import _ from 'underscore';

/**
 * Convert full OSC message to a simple Array

  {address: '/n_go',
    args:
     [ Object { type: 'integer', value: 1000 },
       Object { type: 'integer', value: 0 },
       Object { type: 'integer', value: -1 },
       Object { type: 'integer', value: 3 },
       Object { type: 'integer', value: 0 } ],
    oscType: 'message' }

  to:

    ['/n_go', 1000, 0, -1, 3, 0]

 */
export function parseMessage(msg) {
  if (msg.type !== 'message') {
    throw new Error('Bundle not yet supported' + JSON.stringify(msg));
  }
  return [msg.address].concat(_.pluck(msg.args, 'value'));

}
