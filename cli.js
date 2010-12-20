#!/usr/bin/env node
var dnode = require('dnode');
var forever = require('forever');
var Hash = require('traverse/hash');
var Seq = require('seq');

var argv = require('optimist').argv;
var cmd = argv._[0];

forever.load();

if (cmd === 'listen') {
    var peers = {};
    
    dnode(function (remote, conn) {
        if (remote.role === 'peer') {
            peers[remote.name] = remote;
        }
        
        this.local = {
            list : function (cb) {
                cb(null, forever.list());
            },
        };
        
        this.list = function (cb) {
            Seq(this)
                .extend(Hash(peers).values)
                .parMap(function (peer) {
                    peer.local.list(this);
                })
                .seq(cb)
                .catch(cb)
            ;
        };
    }).listen(argv.port || 9999);
}
else if (cmd === 'connect') {
    dnode(function (remote, conn) {
        this.role = 'peer';
        this.name = argv.name || process.env.HOSTNAME;
    }).connect();
}

function uuid () {
    return Math.floor(Math.random() * Math.pow(2,32)).toString();
}
