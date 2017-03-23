import _ from 'lodash';

import OSCSched from '../OSCSched';

describe('OSCSched', function() {
  var sched, sent, didClearTimeout, didSetTimeout;
  const timeoutId = 1;

  beforeEach(() => {
    sent = null;
    didClearTimeout = false;
    didSetTimeout = false;

    sched = new OSCSched(
      (...args) => {
        sent = args;
      },
      0.05,
      (fn /*, delta*/) => {
        fn();
        didSetTimeout = true;
        return timeoutId;
      },
      tid => {
        didClearTimeout = tid;
      }
    );
  });

  const schedOne = time => {
    sched.schedLoop(
      (now, memo = { i: 0 }) => {
        if (memo.i === 0) {
          return {
            event: {
              time,
              msgs: []
            },
            memo: { i: memo.i + 1 }
          };
        }
      },
      _.now()
    );
  };

  describe('empty sched', function() {
    it('should not have sent nothing', function() {
      sched.schedLoop(
        () => {
          return;
        },
        _.now()
      );
      expect(sent).toBe(null);
    });

    it('should not have set timeout', function() {
      sched.schedLoop(
        () => {
          return;
        },
        _.now()
      );
      expect(didSetTimeout).toBe(false);
    });
  });

  describe('sched at 1', function() {
    it('should have set timeout', function() {
      schedOne(1);
      expect(didSetTimeout).toBe(true);
    });
  });

  describe('sched less than latency', function() {
    it('should have called send right away', function() {
      schedOne(0.01);
      expect(didSetTimeout).toBe(false);
      expect(sent).toBeTruthy();
    });
  });

  describe('sched twice', function() {
    it('should have cleared timeout', function() {
      schedOne(1);
      schedOne(0.5);

      expect(didClearTimeout).toBe(timeoutId);
    });
  });
});
