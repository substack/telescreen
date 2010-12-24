var dnode = require('dnode');
var forever = require('forever');
var Hash = require('traverse/hash');
var Seq = require('seq');

exports = module.exports = telescreen;
function telescreen (name) {
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
        
        proc.on('stderr', function (data) {
            emit('stderr', data.toString(), proc.id);
        });
        
        proc.on('exit', function () {
            emit('exit', proc.id);
        });
        
        proc.on('stop', function () {
            emit('stop', proc.id);
        });
    }
    
    var self = {};
    
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
    
    self.start = self.local.start;
    self.name = name;
    
    var service = dnode(function (remote, conn) {
        conn.on('ready', function () {
            if (remote.role === 'peer') {
                peers[remote.name] = remote;
            }
        });
        
        return Hash.merge(self, {
            subscribe : function (emit, cb) {
                emitters[conn.id] = emit;
                conn.on('end', function () {
                    delete emitters[conn.id];
                });
                if (cb) cb(null);
            },
        });
    });
    
    return Hash.merge(self, {
        listen : function () {
            self.role = 'server';
            return service.listen.apply(service, arguments);
        },
        connect : function () {
            self.role = 'peer';
            return service.connect.apply(service, arguments);
        }
    });
};

exports.listen = function () {
    var s = telescreen('server', 'server');
    return s.listen.apply(s, arguments);
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
