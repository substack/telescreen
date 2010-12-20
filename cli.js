#!/usr/bin/env node
var dnode = require('dnode');
var forever = require('forever');

var argv = require('optimist').argv;
var cmd = argv._[0];

forever.load();

if (cmd === 'listen') {
    dnode(function (remote, conn) {
        this.list = function (cb) {
            cb(forever.list());
        };
    }).listen(argv.port || 9999);
}
