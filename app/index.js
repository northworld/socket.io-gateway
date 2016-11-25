var server = require("http").createServer();
var io = require("socket.io")(server);

var redis = require("redis").createClient(process.env.REDIS_REALTIME);

redis.subscribe("clients");

redis.on("message", function(channel, message) {
    console.log("REDIS " + message);
    io.emit("redis", message);
});

server.listen(8080, function() {
    console.log("Serving on 8080...");
});
