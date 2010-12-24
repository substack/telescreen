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
    
    var emitters = {};
    function emit () {
        var args = arguments;
        Hash(emitters).forEach(function (emitter) {
            emitter.apply({}, args);
        });
    }
    
    function hookProc(proc) {
        proc.on('error', function (err) {
            emit('error', err, proc.id);
        });
        
        proc.on('stdout', function (data) {
            emit('stdout', data.toString(), proc.id);
        });
        
        proc.on('stderr', function (err, data) {
            emit('stderr', data.toString(), proc.id);
        });
        
        proc.on('exit', function () {
            emit('exit', proc.id);
        });
        
        proc.on('stop', function () {
            emit('stop', proc.id);
        });
    }
    
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
                hookProc(proc);
                
                if (cb) cb(null, fromProc(proc));
            },
            subscribe : function (emit, cb) {
                emitters[conn.id] = emit;
                if (cb) cb(null);
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
        
        self.start = function (server, cmd, cb) {
            peers[server].local.start(cmd, cb);
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
