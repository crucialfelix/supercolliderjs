bridge
======

A bridge between a web browser and sclang

websockets <-> OSC

Adds socket.io to an express app server

Serves socket.io and scapi.js

Connects with sclang using OSC

Listens for websocket connections and relays
calls to sclang, returns responses to the websocket client


Usage::

    scjs = require('supercolliderjs');
    app = express(),
    server = http.createServer(app),
    scjs.listen(app, server);

In browser::

    <script src="/socket.io/socket.io.js"></script>
    <script src="/static/js/scapi.js"></script>


listen
------

params::

    app:    an express app
    server: an http server created by express
    io:     optional socket.io connection
            You may pass in an already existing one
            that is shared with other parts of your application
    schost: host that sclang is listening on [default=localhost]
    scport: port that sclang is listenting on [default=57120]
    scapiJsUrl: the URL that your web page will use to retreive
                the browser version of scapi.js
                [default=/static/scapi.js]
