// Generated by CoffeeScript 1.4.0
var has_attributes, http, notifications_server, redis, redis_url, request, rooms, server, sockjs;

http = require('http');

sockjs = require('sockjs');

redis_url = require('redis-url');

request = require('request');

rooms = {};

rooms.names = [];

rooms.add_connection = function(domain, connection) {
  if (this.names.indexOf(domain) === -1) {
    this.names.push(domain);
    redis.subscribe(domain);
    return this[domain] = [connection];
  } else {
    return this[domain].push(connection);
  }
};

rooms.get = function(domain) {
  if (this.names.indexOf(domain) === -1) {
    return [];
  } else {
    return this[domain];
  }
};

rooms.remove = function(conn) {
  var index, name, _i, _len, _ref, _results;
  _ref = this.names;
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    name = _ref[_i];
    index = this[name].indexOf(conn);
    if (index !== -1) {
      delete this[name][index];
      continue;
    } else {
      _results.push(void 0);
    }
  }
  return _results;
};

redis = redis_url.connect(process.env.REDISTOGO_URL);

redis.on("message", function(channel, message) {
  var client, _i, _len, _ref, _results;
  console.log("[>] Message received from the channel: " + message);
  _ref = rooms.get(channel);
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    client = _ref[_i];
    if (client !== void 0) {
      _results.push(client.write(message));
    }
  }
  return _results;
});

redis.on("subscribe", function(channel) {
  return console.log("[*] Now subscribed to Redis " + channel);
});

notifications_server = sockjs.createServer();

has_attributes = function(obj, names) {
  var name, _i, _len;
  for (_i = 0, _len = names.length; _i < _len; _i++) {
    name = names[_i];
    if (obj[name] === void 0) {
      return false;
    }
  }
  return true;
};

notifications_server.on('connection', function(conn) {
  console.log("[+] Connection opened: " + conn.id);
  conn.on('data', function(message) {
    var msg;
    console.log("[<] New message: " + message);
    msg = JSON.parse(message);
    if (!has_attributes(msg, ["type", "domain", "token"]) && msg['type'] !== "auth") {
      return conn.close();
    }
    return request("http://lvh.me:8080/api/companies/" + msg['domain'], {
      qs: {
        'token': msg['token']
      },
      headers: {
        "Accept": "application/json"
      }
    }, function(error, response, body) {
      if (response.statusCode !== 200 || JSON.parse(body) === false) {
        return conn.close();
      }
      return rooms.add_connection(msg['domain'], conn);
    });
  });
  return conn.on('close', function() {
    console.log("[-] Connection closed");
    return rooms.remove(conn);
  });
});

server = http.createServer();

notifications_server.installHandlers(server, {
  prefix: '/notifications'
});

console.log("[*] Listening on 0.0.0.0:5050");

server.listen(5050, '0.0.0.0');
