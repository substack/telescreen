#!/usr/bin/env node
var telescreen = require('telescreen');
var dnode = require('dnode');
var EventEmitter = require('events').EventEmitter;

var argv = require('optimist').argv;
var cmd = argv._[0];

if (cmd === 'listen') {
    telescreen.listen(argv.port || 9999);
}
else if (cmd === 'connect') {
    dnode(function (remote, conn) {
        this.role = 'peer';
        this.name = argv.name || process.env.HOSTNAME;
    }).connect(argv.host, argv.port);
}
else if (cmd === 'view') {
    dnode().connect(argv.host, argv.port, function (ts, conn) {
        var em = new EventEmitter;
        
        em.on('stdout', function (data, id) {
            console.log('<stdout:' + id + '> ' + data);
        });
        
        em.on('stderr', function (data, id) {
            console.log('<stderr:' + id + '> ' + data);
        });
        
        ts.subscribe(em.emit.bind(em));
    });
}
else {
    console.log('Usage: telescreen command [options]');
    console.log('Commands: listen connect view');
}
