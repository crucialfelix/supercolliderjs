
/*
    Node.js web and websocket server for working with the API quark.

    This allows javascript on webpages to easily communicate with a running SuperCollider language application via APIs.

    Start SuperCollider
    Install the API quark ( > 2.0 )
    Activate the OSC responders: API.mountHTTP
    Start this server:
        node api_server.js
    Navigate to http://localhost:4040

    Have fun

*/
var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    host = "localhost",
    port = 4040;

var dgram = require('dgram'),
    osc = require('osc-min'),
    udp = dgram.createSocket("udp4");

var scport = 57120,
    schost = "localhost";

var sockets = {};

server.listen(port);
console.log("Listening on http://localhost:" + port);

app.get('/', function (req, res) {
    // will display api index
    res.sendfile(__dirname + '/templates/index.html');
});

app.get('/fiddle', function (req, res) {
    // will display api index
    res.sendfile(__dirname + '/templates/fiddle.html');
});

app.get('/media/js/scapi.js', function (req, res) {
    // will display api index
    res.sendfile(__dirname + '/lib/browser/scapi.js');
});

app.use("/socket.io",
    express.static(__dirname + '/node_modules/socket.io/lib'));

// call API via OSC
function call(client_id, request_id, path, args) {
    var a = [client_id, request_id, path];
    args = a.concat(args);
    console.log(args);

    var buf = osc.toBuffer({
        address : '/API/call',
        args : args
    });
    udp.send(buf, 0, buf.length, scport, schost);
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

