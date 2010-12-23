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
            processes : function (cb) {
                cb(null, Hash.map(procs, fromProc));
            },
            start : function (cmd, options, cb) {
                if (typeof options === 'function') {
                    cb = options; options = {};
                }
                
                var proc = forever.start(cmd, options || {});
                
                do {
                    var id = (Math.random() * Math.pow(2,32)).toString(16);
                } while (procs[id]);
                proc.id = id;
                procs[id] = proc;
                
                if (cb) cb(null, fromProc(proc));
            },
        };
        
        self.processes = function (cb) {
            Seq(self)
                .extend(Hash(peers).values)
                .parEach(function (peer) {
                    peer.local.processes(this.into(peer.name));
                })
                .seq(function () {
                    cb(null, this.vars);
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
        id : proc.id,
        pid : proc.child.pid,
        start : proc.start,
        stop : proc.stop,
        options : proc.options,
        cmd : [ proc.options.command ].concat(proc.options.options),
    };
}
