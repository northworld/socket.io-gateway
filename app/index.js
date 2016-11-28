var server = require("http").createServer();
var io = require("socket.io")(server);

console.log("Connecting to Redis @ " + process.env.REDIS_REALTIME + "...")
var redis = require("redis").createClient(process.env.REDIS_REALTIME);

redis.subscribe("clients");

redis.on("message", function(channel, message) {
    try {
        console.log("::" + message);
        var info = JSON.parse(message);
        io.emit(info.label, info.payload);
    }
    catch(e) {
        console.log(e);
    }
});

server.listen(8080, function() {
    console.log("Serving on 8080...");
});
