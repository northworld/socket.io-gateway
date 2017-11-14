# Realtime gateway

## How it works

1) Install dependencies with `yarn` (or `npm`)

2) Run the service with `node app/index.js`

3) Connect from socket and join the rooms you want to listen to and add event hooks:

```
  var mySocket = io();
  mySocket.emit('join', 'my-room');
  mySocket.on('echo', function(e) { console.log('my-room echo', e); });
```

4) `POST` events to `/events/<room>/<event>`, the event will be forwarded
  to the connected sockets.

## Monitoring

- There's a log available in `/message-log`
- There are stats with the timestamp for the last message for each room in `/stats`

### Development

- Build Docker image: `docker build -t realtime_gateway:dev .`

- Run `docker run -p 8080:8080 realtime_gateway:dev node index.js`
