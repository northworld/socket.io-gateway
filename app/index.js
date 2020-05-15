#!/usr/bin/env nodejs
const fs      = require('fs');
const express = require('express');
const app     = express();
const http    = require('http');
const https   = require('https');

const http_port = 80;
const https_port = 443;
const logMsgs = process.env.SOCKETIO_GATEWAY_LOG_MSGS || false;

const privateKey = fs.readFileSync('/etc/letsencrypt/live/sio.northworld.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/sio.northworld.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/sio.northworld.com/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);
	
httpsServer.listen(https_port, function(){ console.log(`HTTPS Server Running on *:${https_port}`) });
httpServer.listen(http_port, function(){ console.log(`socket.io-gateway listening on *:${http_port}`); });

var io = require('socket.io')({pingTimeout: 10000, pingInterval: 5000});
io.attach(httpServer);
io.attach(httpsServer);
var adminIo = io.of('/admin');
var lastMsg = {};

app.use(express.json());
app.get('/', (req, res) => res.send('Debug Tools: <a href="/log">Log</a> and <a href="/stats">Stats</a>'));
app.get('/log', (req, res) => {
  res.sendFile(__dirname + '/log.html');
});

app.get('/stats', (req, res) => {
  res.json({
    lastMsg: lastMsg,
  });
});

app.post('/events/:room/:event', (req, res) => {

  io.to(req.params.room).emit(req.params.event, req.body);
  msg = {
    'room': req.params.room,
    'event': req.params.event,
    'content': req.body
  };

  adminIo.emit('forward-message', msg);

  if (logMsgs) {
    console.log(new Date().toISOString(), ' ', msg);
  }

  lastMsg[req.params.room] = new Date().toISOString();

  res.end();
});

io.on('connection', function(socket){
  console.log(`Socket ${socket.id} connected from ${socket.request.connection.remoteAddress}`);

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);
  });

  socket.on('error', () => {
    console.log(`Socket ${socket.id}: error`);
  });

  socket.on('join', (room) => {
    console.log(`Socket ${socket.id} joined room ${room}`);
    socket.join(room);
  });
});

