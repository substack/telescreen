#!/usr/bin/env node
var argv = require('optimist').argv;
var DNode = require('dnode');

DNode(function (remote, conn) {
    
}).connect(argv.port, argv.host);
