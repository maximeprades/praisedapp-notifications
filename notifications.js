var http = require('http');
var sockjs = require('sockjs');
var redis_url = require('redis-url');
var request = require('request');


var rooms = {};
rooms.names = []
rooms.add_connection = function(domain, connection) {
    if (this.names.indexOf(domain) === -1) {
        this.names.push(domain);
        redis.subscribe(domain);
        this[domain] = [connection];
    }
    else {
        this[domain].push(connection);
    }
}
rooms.get = function(domain) {
    if (this.names.indexOf(domain) === -1) {
        return [];
    }
    else {
        return this[domain];
    }
}
rooms.remove = function(conn) {
    for (index in this.names) {
        var name = this.names[index];
        var room = this[name];
        var conn_index = room.indexOf(conn);
        if (conn_index !== -1) {
            delete this[name][conn_index];
            continue;
        }
    }
}

var redis = redis_url.connect(process.env.REDISTOGO_URL);

redis.on("message", function(channel, message) {
    console.log("[>] Message received from the channel: " + message);
    clients = rooms.get(channel);
    var keys = Object.keys(clients);
    for (var index in keys) {
        clients[keys[index]].write(message);
    }
});

redis.on("subscribe", function(channel) {
    console.log("[*] Now subscribed to Redis " + channel);
});


var notifications_server = sockjs.createServer();

function has_attributes(obj, names) {
    var attributes_list = Object.keys(obj);
    for (name_index in names) {
        var name = names[name_index];
        if (obj[name] == undefined)
            return false;
    }
    return true;
}

notifications_server.on('connection', function(conn) {
    console.log("[+] Connection opened: " + conn.id);

    conn.on('data', function(message) {
        console.log("[<] New message: " + message);
        var msg = JSON.parse(message);
        if (!has_attributes(msg, ["type", "domain", "token"]) || msg['type'] !== "auth") {
            return conn.close();
        }
        request("http://lvh.me:8080/api/companies/" + msg['domain'], {
            qs: { 'token': msg['token'] },
            headers: { "Accept": "application/json" }
        }, function(error, response, body) {
            if (response.statusCode !== 200 || JSON.parse(body) === false) {
                return conn.close(); 
            }
            rooms.add_connection(msg['domain'], conn);
        });
    });

    conn.on('close', function() {
        console.log("[-] Connection closed");
        rooms.remove(conn);
    });
});


var server = http.createServer();

notifications_server.installHandlers(server, {prefix:'/notifications'});


console.log("[*] Listening on 0.0.0.0:5050");
server.listen(5050, '0.0.0.0');
