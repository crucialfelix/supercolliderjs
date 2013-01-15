
/*
    Node.js web and websocket server for working with the API quark.

    This allows javascript on webpages to easily communicate with a running SuperCollider language application via APIs.

    Start SuperCollider
    Install the API quark ( > 2.0 )
    Activate the OSC responders in supercollider:
        API.mountDuplexOSC
    Start this server:
        node bin/scapi-server.js

    Navigate browser to
        http://localhost:4040/fiddle.html

*/

var express = require('express'),
    http = require('http'),
    join = require("path").join,
    socketio = require('socket.io'),
    dgram = require('dgram'),
    osc = require('osc-min'),
    udp = dgram.createSocket("udp4");

/**
 * SC API Server prototype.
 */

var scapi = exports = module.exports = {};


/**
 * Listen for connections.
 *
 * A node `http.Server` is returned.
 *
 * @return {http.Server}
 * @api public
 */

scapi.listen = function(host, port, schost, scport) {
    this.host = host ? host : "localhost";
    this.port = port ? port : 4040;
    this.schost = schost ? schost : "localhost";
    this.scport = scport ? scport : 57120;

    // hold these so you can unlisten
    var self = this,
        app = express(),
        server = http.createServer(app),
        io = socketio.listen(server),
        tplRoot = join(__dirname, "../templates/");

    var sockets = {};

    server.listen(this.port);
    console.log("Listening on http://localhost:" + this.port);

    // static
    app.get('/', function (req, res) {
        // will display api index
        res.sendfile(join(__dirname, '../templates/index.html'));
    });

    app.get('/fiddle', function (req, res) {
        // will display api index
        res.sendfile(join(__dirname, '../templates/fiddle.html'));
    });

    app.get('/media/js/scapi.js', function (req, res) {
        // will display api index
        res.sendfile(join(__dirname, '../browser/scapi.js'));
    });

    // you want the real location of it
    // this assumes it was installed here
    // and not in the app that installed this lib
    app.use("/socket.io",
        express.static(__dirname + '../node_modules/socket.io/lib'));

    // call API via OSC
    function call(client_id, request_id, path, args) {
        var a = [client_id, request_id, path];
        args = a.concat(args);
        console.log(args);

        var buf = osc.toBuffer({
            address : '/API/call',
            args : args
        });
        udp.send(buf, 0, buf.length, self.scport, self.schost);
    }

    // receive response from API via OSC and forward it to websocket
    function reply(signal, msg) {
        var client_id = msg.args[0].value,
            request_id = msg.args[1].value,
            result = msg.args[2].value;

        // socket.io does not yet have a way to fetch socket by id
        // so must store them in this process
        var socket = sockets[client_id];

        if(signal === 'reply') {
            try {
                result = JSON.parse( result );
                result = result.result;
            } catch(e) {
                console.log("Malformed JSON");
                console.log(result);
                result = "MALFORMED JSON RESPONSE:" + result;
                signal = 'scapi_error';
            }
        }

        if(socket && (!socket.disconnected)) {
            socket.emit(signal, {'request_id': request_id, 'result': result });
        } else {
            // should splice the array out so it doesn't build up empty ids
            console.log("client socket gone away" + client_id);
        }
    }

    // receive OSC
    udp.on('message', function(msgbuf, rinfo) {
        var msg = osc.fromBuffer(msgbuf);
        if(msg.address === '/API/not_found') {
            return reply('scapi_error', msg);
        }
        if(msg.address === '/API/error') {
            return reply('scapi_error', msg);
        }
        if(msg.address === '/API/reply') {
            return reply('reply', msg);
        }
    });

    // udp.on('error')


    // incoming websockets
    io.sockets.on('connection', function(socket) {
        socket.on('call', function (data) {
            sockets[socket.id] = socket;
            call(socket.id, data.request_id, data.path, data.args);
        });
    });

    // TODO on disconnect, forget the socket

};
