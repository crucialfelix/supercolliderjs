import * as _  from 'underscore';

jest.dontMock('../middleware/OSCSched');
var OSCSched = require('../middleware/OSCSched').default;


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
      _.now(),
      0.05,
      (fn/*, delta*/) => {
        fn();
        didSetTimeout = true;
        return timeoutId;
      },
      (tid) => {
        didClearTimeout = tid;
      }
    );

  });

  describe('empty sched', function() {
    it('should not have sent nothing', function() {
      sched.sched([]);
      expect(sent).toBe(null);
    });

    it('should not have set timeout', function() {
      sched.sched([]);
      expect(didSetTimeout).toBe(false);
    });
  });

  describe('sched at 1', function() {
    it('should have set timeout', function() {
      sched.sched([
        {
          time: 1,
          packets: []
        }
      ]);

      expect(didSetTimeout).toBe(true);
    });
  });

  describe('sched less than latency', function() {
    it('should have called send right away', function() {
      sched.sched([
        {
          time: 0.01,
          packets: []
        }
      ]);

      expect(didSetTimeout).toBe(false);
      expect(sent).toBeTruthy();
    });
  });

  describe('sched twice', function() {

    it('should have cleared timeout', function() {
      sched.sched([
        {
          time: 1,
          packets: []
        }
      ]);

      sched.sched([
        {
          time: 0.5,
          packets: []
        },
        {
          time: 1,
          packets: []
        }
      ]);

      expect(didClearTimeout).toBe(timeoutId);
    });
  });
});
