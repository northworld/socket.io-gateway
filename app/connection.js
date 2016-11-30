var net = require('net');
var timers = require('timers');

const EventEmitter = require('events');

class Connection extends EventEmitter {

    constructor(host, port) {

        super();

        this.host = host || '127.0.0.1';
        this.port = port || 5005;
        this.socket = null;

        this.connected = false;

        timers.setInterval(this._checkConnection.bind(this), 2);

    }

    _checkConnection() {

        if(!this.socket) {

            this.socket = net.connect(
                this.port,
                this.host,
                this._handleConnection.bind(this)
            );

            this.socket.on('data', this._handleData.bind(this));

            this.socket.on('error', this._handleError.bind(this));

            this.socket.on('close', this._handleCloseConnection.bind(this));

        }

    }

    emit(data) {

        if(this.connected) {

            var jstr = Buffer.from(JSON.stringify(data), 'utf8');
            var buf = Buffer.alloc(4 + jstr.length);
            buf.writeInt32LE(jstr.length);
            jstr.copy(buf, 4);
            this.socket.write(buf);

        }

    }

    _handleConnection() {

        this.connected = true;
        this.buffer = new Buffer(0);
        super.emit('connect');

    }

    _handleError(err) {

        if(err.code != 'ECONNREFUSED' && err.code != 'ECONNRESET') {
            console.log(err);
        }

    }

    _handleData(data) {

        this.buffer = Buffer.concat([this.buffer, data]);

        if(this.buffer.length >= 4) {

            var dataLength = this.buffer.readInt32LE(0);

            if(this.buffer.length >= 4 + dataLength) {

                var jstr = this.buffer.toString('utf8', 4, 4 + dataLength);
                var j = JSON.parse(jstr);
                this.buffer = this.buffer.slice(4 + dataLength);

                super.emit('message', j);

            }

        }
    }

    _handleCloseConnection() {

        var wasConnected = this.connected;

        this.connected = false;
        this.socket = null;

        if(wasConnected) {
            super.emit('disconnect');
        }

    }

}

module.exports = Connection;