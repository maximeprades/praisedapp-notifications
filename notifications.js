var http = require('http');
var sockjs = require('sockjs');
var redis_url = require('redis-url');


var clients = {};

var redis = redis_url.connect(process.env.REDISTOGO_URL);

redis.on("message", function(channel, message) {
    console.log("[>] Message received from the channel: " + message);
    console.log('clients: ' + Object.keys(clients));
    var keys = Object.keys(clients);
    for (var index in keys) {
        console.log(keys[index]);
        clients[keys[index]].write(message);
    }
});

redis.on("subscribe", function(channel) {
    console.log("[*] Now subscribed to Redis " + channel);
});


var notifications_server = sockjs.createServer();

notifications_server.on('connection', function(conn) {
    console.log("[+] Connection opened: " + conn.id);
    clients[conn.id] = conn;
    conn.on('data', function(message) {
        console.log("[<] New message: " + message);
        conn.write(message);
    });
    conn.on('close', function() {
        console.log("[-] Connection closed");
        delete clients[conn.id];
    });
});


var server = http.createServer();

notifications_server.installHandlers(server, {prefix:'/notifications'});


redis.subscribe('channel');
console.log("[*] Listening on 0.0.0.0:8080");
server.listen(8080, '0.0.0.0');
