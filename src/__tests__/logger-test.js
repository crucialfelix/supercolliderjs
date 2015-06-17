jest.autoMockOff();

var Logger = require('../logger');

describe('Logger', function() {
  it('dbug', function() {
    var l = new Logger(true, false);
    l.dbug('some text');
  });

});
