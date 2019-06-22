// jest.autoMockOff();

var Logger = require('../logger').default;

describe('Logger', function() {
  var l = new Logger(true, false);

  it('dbug', function() {
    l.dbug('testing dbug');
  });

  it('should handle JSON type object', function() {
    l.dbug({ testing: { object: ['dbug', 3] } });
  });
});
