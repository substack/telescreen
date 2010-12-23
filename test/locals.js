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
    
    var mock = {};
    mock.list = [ {
        pid: 5066,
        foreverPid: 5065,
        logFile: '/tmp/forever/foreverlvA.log',
        options: [],
        file: 'nexus/index.js',
        pidFile: '/tmp/forever/pids/foreverlvA.pid',
    } ];
    
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
                
                ts.list(function (err, xs) {
                    clearTimeout(listT);
                    if (err) assert.fail(err);
                    
                    assert.eql(xs[0][proc.id], proc);
                    assert.eql(xs.length, 1);
                    assert.eql(Hash(xs[0]).length, 1);
                    
                    conn.end();
                    server.end();
                });
            });
        }).on('localError', function (err) { throw err });
    });
};
