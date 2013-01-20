http = require('http')
sockjs = require('sockjs')
redis_url = require('redis-url')
request = require('request')


rooms = {}
rooms.names = []
rooms.add_connection = (domain, connection) ->
    if this.names.indexOf(domain) is -1
        this.names.push(domain)
        redis.subscribe(domain)
        this[domain] = [connection]
    else
        this[domain].push(connection)

rooms.get = (domain) ->
    if this.names.indexOf(domain) is -1 then [] else this[domain]

rooms.remove = (conn) ->
    for name in this.names
        index = this[name].indexOf(conn)
        if index isnt -1
            delete this[name][index]
            continue

redis = redis_url.connect(process.env.REDISTOGO_URL)

redis.on "message", (channel, message) ->
    console.log("[>] Message received from the channel: " + message)
    for client in rooms.get(channel) when client isnt undefined
        client.write(message)

redis.on "subscribe", (channel) ->
    console.log("[*] Now subscribed to Redis #{channel}")


notifications_server = sockjs.createServer()

has_attributes = (obj, names) ->
    for name in names
        return false if obj[name] == undefined
    return true

notifications_server.on 'connection', (conn) ->
    console.log("[+] Connection opened: #{conn.id}")

    conn.on 'data', (message) ->
        console.log("[<] New message: #{message}")
        msg = JSON.parse(message)
        if not has_attributes(msg, ["type", "domain", "token"]) and msg['type'] isnt "auth"
            return conn.close()

        request "http://lvh.me:8080/api/companies/#{msg['domain']}", {
            qs: { 'token': msg['token'] },
            headers: { "Accept": "application/json" }
        }, (error, response, body) ->
            if response.statusCode isnt 200 or JSON.parse(body) is false
                return conn.close()
            rooms.add_connection(msg['domain'], conn)

    conn.on 'close', () ->
        console.log("[-] Connection closed")
        rooms.remove(conn)


server = http.createServer()

notifications_server.installHandlers(server, {prefix: '/notifications'})


console.log("[*] Listening on 0.0.0.0:5050")
server.listen(5050, '0.0.0.0')
