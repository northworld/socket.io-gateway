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

- There's a log available in `/log`
- There are stats with the timestamp for the last message for each room in `/stats`

### Docker

A docker image is available:

- Run `docker run -d -p 5005:5005 zoomeranalytics/socket.io-gateway:1.0.1 node index.js`
