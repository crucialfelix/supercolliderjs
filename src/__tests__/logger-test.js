jest.autoMockOff();

var Logger = require('../logger');

describe('Logger', function() {
  var l = new Logger(true, false);

  it('dbug', function() {
    l.dbug('some text');
  });

  it('should handle JSON type object', function() {
    l.dbug({some: {object: ['like', 'this', 3]}});
  });

});
