var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('node-uuid');
app.use(express.static(__dirname + '/public/'));
var rooms = [];

function Room(id) {
  this.namespace = io.of("/room/" + id);
  this.id = id;
  this.users = [];
  var room = this;

  this.namespace.on('connection', function(socket) {
    room.users.push(socket.client.id);

    console.log("user joined room");

    socket.on('disconnect', function(){
      console.log('user disconnected');
    });

    socket.on('signal', function(signal) {
      console.log(signal);
      socket.broadcast.emit(signal);
    });

  });
}


app.get('/', function(req, res){
  res.sendFile("public/index.html", {"root": __dirname});
});

app.get('/room/:room', function(req, res){
  res.sendFile("public/index.html", {"root": __dirname});
});

app.get('/addRoom', function(req, res){
  var roomId = uuid.v1();
  rooms.push(new Room(roomId));
  res.json('{"roomId":"' + roomId + '"}');
});

http.listen(8080, function(){
  console.log('listening on *:8080');
});