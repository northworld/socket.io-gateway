#!/usr/bin/env nodejs
const fs            = require('fs');
const express       = require('express');
const app           = express();
const http          = require('http');
const https         = require('https');
const sanitizeHtml  = require('sanitize-html');
const path          = require('path');
 
const logMsgs       = process.env.SOCKETIO_GATEWAY_LOG_MSGS || false;
const useSSL        = process.env.USE_SSL || false;
var httpsServer;

if (useSSL) {
  const https_port = 443;
  const privateKey = fs.readFileSync('/etc/letsencrypt/live/sio.northworld.com/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('/etc/letsencrypt/live/sio.northworld.com/cert.pem', 'utf8');
  const ca = fs.readFileSync('/etc/letsencrypt/live/sio.northworld.com/chain.pem', 'utf8');
  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
  };
  httpsServer = https.createServer(credentials, app);
  httpsServer.listen(https_port, function(){ console.log(`HTTPS Server Running on *:${https_port}`) });
}

const http_port = 80;
const httpServer = http.createServer(app);
httpServer.listen(http_port, function(){ console.log(`socket.io-gateway listening on *:${http_port}`); });

var io = require('socket.io')({pingTimeout: 10000, pingInterval: 5000});
io.attach(httpServer);
if (useSSL) { io.attach(httpsServer); }
var adminIo = io.of('/admin');
var lastMsg = {};

app.use(express.json());
app.use('/.well-known', express.static(path.join(__dirname, 'static')))
app.get('/', (req, res) => res.send('Debug Tools: <a href="/log">Log</a> and <a href="/stats">Stats</a>'));
app.get('/log', (req, res) => {
  res.sendFile(__dirname + '/log.html');
});

app.get('/stats', (req, res) => {
  res.json({
    lastMsg: lastMsg,
  });
});

app.get('/count/:room', (req, res) => {
  var room = io.sockets.adapter.rooms[req.params.room]
  var room_count = room ? room.length : 0
  res.json({
    count: room_count
  });
});

app.post('/events/:room/:event', (req, res) => {

  io.to(req.params.room).emit(req.params.event, req.body);
  var room = io.sockets.adapter.rooms[req.params.room]
  var room_count = room ? room.length : 0
  var msg_length = JSON.stringify(req.body).length;
  var key_lengths = Object.keys(req.body).map(function(k) {return k + ": " + (req.body[k] ? JSON.stringify(req.body[k]).length : 0)});

  msg = {
    'room': req.params.room,
    'event': req.params.event,
    'room_count': room_count,
    'key_length': key_lengths, 
    "msg_length": msg_length,
    'total_length': msg_length * room_count
    }


  adminIo.emit('forward-message', msg);

  if (logMsgs) {
    console.log(new Date().toISOString(), ' ', msg);
    console.log("raw ", req.body);
  }

  lastMsg[req.params.room] = new Date().toISOString();

  res.end();
});

io.on('connection', function(socket){
  console.log(`Socket ${socket.id} connected from ${socket.request.connection.remoteAddress}`);

  socket.on('disconnecting', () => {

    Object.keys(socket.rooms).forEach(function (k) {
      if (k == socket.id) { return; }
      if (k.includes('admin')) {return; }
      var roomobj = io.sockets.adapter.rooms[k]
      var count = roomobj ? roomobj.length - 1 : 0
      io.to(k + "_ADMIN").emit('refresh_admin', {'client_count': count});
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);
  });

  socket.on('error', () => {
    console.log(`Socket ${socket.id}: error`);
  });

  socket.on('join', (room) => {
    console.log(`Socket ${socket.id} joined room ${room}`);
    socket.join(room);
    var roomobj = io.sockets.adapter.rooms[room]
    var count = roomobj ? roomobj.length : 0
    io.to(room + "_ADMIN").emit('refresh_admin', {'client_count': count});
  });
});

