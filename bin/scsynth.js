#!/usr/bin/env node

var
    path = require('path'),
    lib = path.join(__dirname, '../lib/nodejs/'),
    Server = require(lib + 'scsynth'),
    options = require(lib + 'parse-options');

var s = new Server(options());

s.boot();
