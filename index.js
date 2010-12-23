var dnode = require('dnode');
var forever = require('forever');
var Hash = require('traverse/hash');
var Seq = require('seq');

exports = module.exports = server;
exports.server = server;
function server (name) {
    forever.load();
    
    var peers = {};
    var procs = {};
    
    return dnode(function (remote, conn) {
        var self = this;
        
        conn.on('ready', function () {
            if (remote.role === 'peer') {
                peers[remote.name] = remote;
            }
        });
        
        self.name = name;
        self.role = 'peer';
        
        self.local = {
            list : function (cb) {
                cb(null, Hash.map(procs, fromProc));
            },
            start : function (cmd, options) {
                var child = forever.start(cmd, options || {});
                var id = child.childData.foreverPid;
                procs[id] = proc;
            },
        };
        
        self.list = function (cb) {
            Seq(self)
                .extend(Hash(peers).values)
                .parMap(function (peer) {
                    peer.local.list(this);
                })
                .seq(function () {
                    cb(null, this.stack);
                })
               .catch(cb)
            ;
        };
        
        self.start = function (server, name, cmd) {
            peers[server].start(name, cmd);
        };
    });
};

exports.listen = function () {
    var server = exports.server('server');
    return server.listen.apply(server, arguments);
};

exports.fromProc = fromProc;
function fromProc (proc) {
    return {
        id : proc.childData.foreverPid,
        pid : proc.childData.pid,
        start : proc.start,
        stop : proc.stop,
        options : proc.options,
        sh : [ proc.command ].concat(proc.options),
    };
}
