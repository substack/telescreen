var dnode = require('dnode');
var fs = require('fs');
var Hash = require('traverse/hash');

// crafty hack to get around module loading and caching
var forever = {};
var forever_ = require('forever');
var telescreenModule = { exports : {} };

process.binding('evals').Script.runInNewContext(
    fs.readFileSync(__dirname + '/../index.js').toString(),
    {
        require : function (p) {
            return p === 'forever' ? forever : require(p)
        },
        module : telescreenModule,
        exports : telescreenModule.exports,
        console : console,
    }
);
var telescreen = telescreenModule.exports;

exports.local_procs = function (assert) {
    var loadT = setTimeout(function () {
        assert.fail('telescreen never did forever.load()');
    }, 100);
    
    forever.load = function () {
        clearTimeout(loadT);
    };
    
    forever.start = function () {
        return forever_.start.apply({}, arguments);
    };
    
    var listT = setTimeout(function () {
        assert.fail('never got the process list');
    }, 500);
    
    var port = Math.floor(Math.random() * (Math.pow(2,16) - 10000) + 10000);
    var server = telescreen.listen(port);
    
    server.on('ready', function () {
        dnode.connect(port, function (ts, conn) {
            var cmd = ['perl','-le','print "moo"'];
            ts.local.start(cmd, { silent : true }, function (err, proc) {
                assert.eql(cmd, proc.cmd);
                
                ts.processes(function (err, xs) {
                    clearTimeout(listT);
                    if (err) assert.fail(err);
                    
                    assert.eql(xs.server[proc.id], proc);
                    assert.eql(Hash(xs).length, 1);
                    assert.eql(Hash(xs.server).length, 1);
                    
                    conn.end();
                    server.end();
                });
            });
        }).on('localError', function (err) { throw err });
    });
};
