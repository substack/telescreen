var dnode = require('dnode');

// use the forever in test/mock/ for hackish testing purposes
require.paths.unshift(__dirname + '/mock');
var forever = require('forever');
var telescreen = require(__dirname + '/..');

exports.local_procs = function (assert) {
    var loadT = setTimeout(function () {
        assert.fail('telescreen never did forever.load()');
    }, 100);
    
    forever.load = function () {
        clearTimeout(loadT);
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
    
    forever.list = function () { return mock.list };
    
    var listT = setTimeout(function () {
        assert.fail('never got the process list');
    }, 500);
    
    var port = Math.floor(Math.random() * (Math.pow(2,16) - 10000) + 10000);
    
    var server = telescreen.listen(port);
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            remote.list(function (err, xs) {
                clearTimeout(listT);
                if (err) assert.fail(err);
                assert.eql(xs, mock.list);
                conn.end();
                server.end();
            })
        }).on('localError', function (err) { throw err });
    });
};
