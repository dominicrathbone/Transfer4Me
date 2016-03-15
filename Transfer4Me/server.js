var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('node-uuid');

app.use(express.static(__dirname + '/public/'));

function Room(id, users) {
  this.id = id;
  this.users = users;
}

var rooms = [];

app.get('/', function(req, res){
  res.sendFile("public/index.html", {"root": __dirname});
});

app.get('/room/:room', function(req, res){
  res.sendFile("public/index.html", {"root": __dirname});
});

app.get('/addRoom', function(req, res){
  var roomId = uuid.v1();
  rooms.push(new Room(roomId, []));
  res.json('{"roomId":"' + roomId + '"}');
});

io.on('connection', function(socket) {
  console.log("user joined room");
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(8080, function(){
  console.log('listening on *:8080');
});