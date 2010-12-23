var dnode = require('dnode');
var fs = require('fs');
var Seq = require('seq');
var Hash = require('traverse/hash');

// crafty hack to get around module loading and caching
var forever = {};
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

exports.peer_procs = function (assert) {
    var loadT = setTimeout(function () {
        assert.fail('telescreen never did forever.load()');
    }, 100);
    
    forever.load = function () {
        clearTimeout(loadT);
    };
    
    function genPid () {
        var id = Math.floor(Math.random() * Math.pow(16,8)).toString(16);
        return {
            pid : Math.floor(Math.random() * Math.pow(2,16)),
            foreverPid : Math.floor(Math.random() * Math.pow(2,16)),
            logFile : '/tmp/forever/forever' + id + '.log',
            options : [],
            file : Math.floor(Math.random() * Math.pow(16,3)) + '.js',
            pidFile : '/tmp/forever/pids/forever' + id + '.pid',
        }
    }
    
    var mock = {
        peer1 : { abc : genPid() },
        peer2 : { def : genPid(), hij : genPid(), klm : genPid() },
        peer3 : { nop : genPid() },
        server : {}
    };
    
    var listT = setTimeout(function () {
        assert.fail('never got the process list');
    }, 500);
    
    var port = Math.floor(Math.random() * (Math.pow(2,16) - 10000) + 10000);
    
    var server = telescreen.listen(port);
    server.on('ready', function () {
        Seq(1,2,3)
            .parEach(function (i) {
                var next = this;
                var c = dnode(function () {
                    this.role = 'peer';
                    var name = this.name = 'peer' + i;
                    
                    this.local = {};
                    this.local.processes = function (cb) {
                        cb(null, mock[name]);
                    };
                    
                    this.processes = function () {
                        assert.fail('directly called, should be local');
                    };
                });
                c.connect(port, this.bind({}, null));
                c.on('localError', function (err) { throw err });
            })
            .seq(function () {
                setTimeout(this, 100);
            })
            .seq(function () {
                dnode.connect(port, function (remote, conn) {
                    remote.processes(function (err, ps) {
                        clearTimeout(listT);
                        if (err) assert.fail(err);
                        
                        assert.eql(ps.server, mock.server);
                        assert.eql(ps.peer1, mock.peer1);
                        assert.eql(ps.peer2, mock.peer2);
                        assert.eql(ps.peer3, mock.peer3);
                        assert.eql(ps, mock);
                        
                        conn.end();
                        server.end();
                    })
                }).on('localError', function (err) { throw err });
            })
        ;
    });
};
