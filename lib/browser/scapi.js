/* global window */

/*
    assumes the presence of:
        $ = jQuery
        io = socket.io
*/

(function(window, $, io) {

    'use strict';

    var SCApi = function(host, port) {

        var self = this;
        var Deferred = $.Deferred;

        this.socket = io.connect();

        this.calls = {};
        this.request_id = 0;

        this.call = function(path, args, success, error) {
            var d = Deferred();
            if(success) {
                d.done(success);
            }
            if(error) {
                d.fail(error);
            }
            self.request_id += 1;
            self.calls[self.request_id] = d;
            self.socket.emit('call', {
                request_id: self.request_id,
                path: path, args: args
            });
            return d;
        };

        this.socket.on('reply', function (data) {
            self.calls[data.request_id].resolve(data.result);
            delete self.calls[data.request_id];
        });

        this.socket.on('scapi_error', function (data) {
            self.calls[data.request_id].reject(data.result);
            delete self.calls[data.request_id];
        });

    };

    window.SCApi = SCApi;

})(window, window.$, window.io);
