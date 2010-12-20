#!/usr/bin/env node
var telescreen = require('telescreen');

var argv = require('optimist').argv;
var cmd = argv._[0];

if (cmd === 'listen') {
    telescreen.listen(argv.port || 9000);
}
else if (cmd === 'connect') {
    dnode(function (remote, conn) {
        this.role = 'peer';
        this.name = argv.name || process.env.HOSTNAME;
    }).connect();
}
else {
    console.log('Usage: telescreen command [options]');
    console.log('Commands: listen connect');
}
