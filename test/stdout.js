var dnode = require('dnode');
var fs = require('fs');
var Hash = require('traverse/hash');
var EventEmitter = require('events').EventEmitter;
var telescreen = require('telescreen');

exports.events = function (assert) {
    var port = Math.floor(Math.random() * (Math.pow(2,16) - 10000) + 10000);
    
    var server = telescreen.listen(port);
    var stdoutTO = setTimeout(function () {
        assert.fail('never got stdout');
    }, 500);
    
    server.on('ready', function () {
        dnode.connect(port, function (ts, conn) {
            var cmd = ['perl','-le','print "moo"'];
            
            var em = new EventEmitter;
            em.on('stdout', function (data) {
                clearTimeout(stdoutTO);
                assert.eql(data, 'moo\n');
                conn.end();
                server.end();
            });
            
            ts.subscribe(em.emit.bind(em), function () {
                ts.local.start(cmd, { silent : true }, function (err, proc) {
                    assert.eql(cmd, proc.cmd);
                });
            });
        }).on('localError', function (err) { throw err });
    });
};
