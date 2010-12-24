var dnode = require('dnode');
var fs = require('fs');
var Hash = require('traverse/hash');
var EventEmitter = require('events').EventEmitter;
var telescreen = require('telescreen');

exports.events = function (assert) {
    var port = Math.floor(Math.random() * (Math.pow(2,16) - 10000) + 10000);
    
    var server = telescreen.listen(port);
    var stderrTO = setTimeout(function () {
        assert.fail('never got stderr');
    }, 500);
    
    server.on('ready', function () {
        dnode.connect(port, function (ts, conn) {
            var cmd = ['perl','-e','warn "moo\n"'];
            
            var em = new EventEmitter;
            em.on('stderr', function (data) {
                clearTimeout(stderrTO);
                assert.eql(data, 'moo\n');
                conn.end();
                server.end();
            });
            
            ts.local.subscribe(em.emit.bind(em), function () {
                ts.local.start(cmd, { silent : true }, function (err, proc) {
                    assert.eql(cmd, proc.cmd);
                });
            });
        }).on('localError', function (err) { throw err });
    });
};
