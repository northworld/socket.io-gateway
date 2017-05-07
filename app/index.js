var http = require("http");
var socketIo = require("socket.io");
var uuid = require("node-uuid");

var Connection = require("./connection");
var connection = new Connection(process.env.SOCKETIO_GATEWAY_HOST, process.env.SOCKETIO_GATEWAY_PORT);

var clients = null;
var server = null;
var io = null;

function patchServer(server) {

    var sockets = {};
    var nextSocketId = 1;

    server.on('connection', function(socket) {

        var socketId = nextSocketId++;
        sockets[socketId] = socket;

        socket.on('close', function() {
            delete sockets[socketId];
        });

    });

    server.destroy = function(callback) {

        this.close(callback);
        for(var socketId in sockets) {
            sockets[socketId].destroy();
        }

    };

}

connection.on('connect', function() {

    console.log("Connected to app server, starting socket.io...");

    // start up the socket io server
    server = http.createServer();
    patchServer(server);

    io = socketIo(server);
    clients = {};

    // this module allows us to capture all client events using wildcard "*"
    io.use(require("socketio-wildcard")());

    // when a client connects, set up event listeners to forward everything to redis
    io.on("connect", function(socket) {
        var socketId = uuid.v1();
        console.log("Client connected, " + socketId)

        clients[socketId] = socket;

        connection.emit(JSON.stringify({
            client: socketId,
            message: 'connect'
        }));


        socket.on("*", function(packet) {
            connection.emit(JSON.stringify({
                client: socketId,
                message: packet.data[0],
                args: packet.data.slice(1)
            }))
        });

        socket.on("disconnect", function() {
            delete clients[socketId];
            connection.emit(JSON.stringify({
                client: socketId,
                message: 'disconnect'
            }));
        });

    });

    server.listen(8080, function() {
        console.log("Serving on 8080...");
    });

});

connection.on('message', function(info) {

    try {
        //var info = JSON.parse(message);
        var recipient = info.client ? clients[info.client] : io;
        console.log("Relay message: " + info.message + " (" + info.args + ")");
        recipient.emit.apply(recipient, [info.message].concat(info.args));

    }
    catch(e) {
        console.log(e);
    }

});

connection.on('error', console.log.bind(console));

connection.on('disconnect', function() {

    console.log("Disconnected from app server, shutting down socket.io...");

    server.destroy(function() {
        console.log("Closed socket.io server.");
    });

    server = null;
    io = null;
    clients = null;

});

console.log("Waiting for app server...");
