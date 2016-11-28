var server = require("http").createServer();
var io = require("socket.io")(server);
var uuid = require("node-uuid");

console.log("Connecting to Redis @ " + process.env.REDIS_REALTIME + "...")
var redisIncoming = require("redis").createClient(process.env.REDIS_REALTIME);
var redisOutgoing = require("redis").createClient(process.env.REDIS_REALTIME);

var clients = {};

redisOutgoing.subscribe("outgoing");

redisOutgoing.on("message", function(channel, message) {
    try {
        console.log("::" + message);
        var info = JSON.parse(message);
        var recipient = info.client ? clients[info.client] : io;
        recipient.emit.apply(recipient, [info.message].concat(info.args));
    }
    catch(e) {
        console.log(e);
    }
});

// this module allows us to capture all client events using wildcard "*"
io.use(require("socketio-wildcard")());

// when a client connects, set up event listeners to forward everything to redis
io.on("connect", function(socket) {

    var socketId = uuid.v1();

    clients[socketId] = socket;

    redisIncoming.publish("incoming", JSON.stringify({
        client: socketId,
        message: 'connect'
    }));

    socket.on("*", function(packet) {
        redisIncoming.publish("incoming", JSON.stringify({
            client: socketId,
            message: packet.data[0],
            args: packet.data.slice(1)
        }))
    });

    socket.on("disconnect", function() {
        delete clients[socketId];
        redisIncoming.publish("incoming", JSON.stringify({
            client: socketId,
            message: 'disconnect'
        }));
    });

});

server.listen(8080, function() {
    console.log("Serving on 8080...");
});
