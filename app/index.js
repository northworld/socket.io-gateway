var http = require("http");
var socketIo = require("socket.io");
var uuid = require("node-uuid");

var Connection = require("./connection");
var connection = new Connection('127.0.0.1', 5005);

var clients = null;
var server = null;
var io = null;

connection.on('connect', function() {

    console.log("Connected to app server, starting socket.io...");

    // start up the socket io server
    server = http.createServer();
    io = socketIo(server);
    clients = {};

    // this module allows us to capture all client events using wildcard "*"
    io.use(require("socketio-wildcard")());

    // when a client connects, set up event listeners to forward everything to redis
    io.on("connect", function(socket) {

        var socketId = uuid.v1();

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

        //console.log("::" + message);
        //var info = JSON.parse(message);
        var recipient = info.client ? clients[info.client] : io;
        recipient.emit.apply(recipient, [info.message].concat(info.args));

    }
    catch(e) {
        console.log(e);
    }

});

connection.on('disconnect', function() {

    console.log("Disconnected from app server, shutting down socket.io...");

    // shutdown the socket io server
    server.close();
    for(var id in clients) {
        clients[id].destroy();
    }

    server = null;
    io = null;
    clients = null;

});

console.log("Waiting for app server...");