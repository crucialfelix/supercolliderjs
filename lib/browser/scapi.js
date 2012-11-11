
var SCApi = function(host, port) {

    var self = this;

    this.socket = io.connect();

    this.calls = {};
    this.request_id = 0;

    this.call = function(path, args, success, error) {
        self.request_id += 1;
        self.calls[self.request_id] = {'success': success, 'error': error };
        self.socket.emit('call', { request_id: self.request_id, path: path, args: args });
        // console.log('calling: ' + path);
    };

    this.socket.on('reply', function (data) {
        //console.log(data);
        var callback = self.calls[data.request_id].success;
        callback(data.result);
        delete self.calls[data.request_id];
    });

    this.socket.on('scapi_error', function (data) {
        //console.log(data);
        var callback = self.calls[data.request_id].error;
        callback(data.result);
        delete self.calls[data.request_id];
    });

};

