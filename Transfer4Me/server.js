var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('node-uuid');
app.use(express.static(__dirname + '/public/'));

var baseUrl = "/room/"
var rooms = [];

function Room(id) {
    this.namespace = io.of(baseUrl.concat(id));
    this.id = id;
    this.uploader = null;
    this.users = 0;
    var room = this;

    this.namespace.on('connection', function(socket) {
        if(!room.uploader) {
            room.uploader = socket.client.id;
        } else {
            room.users++;
            room.namespace.to(room.namespace.name.concat("#",room.uploader)).emit('signal', JSON.stringify({
                'user': "SERVER",
                'toUser': room.uploader,
                "users": room.users
            }));
        }



        console.log(socket.client.id + " connected to room: " + room.id);

        socket.on('disconnect', function(){
            console.log(socket.client.id + " disconnected from room: " + room.id);
            if(this.client.id == room.uploader) {
                for(var i = 0; i < rooms.length; i++) {
                    if(rooms[i].uploader == this.client.id) {
                        rooms.splice(i,1);
                    }
                }
            } else {
                http://localhost:8080/room/0534a2f0-f925-11e5-8f07-25f6c3689bf1room.users--;
                room.namespace.to(room.namespace.name.concat("#",room.uploader)).emit('signal', JSON.stringify({
                    'user': "SERVER",
                    'toUser': room.uploader,
                    "users": room.users
                }));
            }
        });

        socket.on('signal', function(signal) {
            var parsedSignal = JSON.parse(signal);
            console.log(signal);
            if(parsedSignal.toUser) {
                room.namespace.to(room.namespace.name.concat("#",parsedSignal.toUser.userId)).emit('signal',signal);
            } else {
                room.namespace.to(room.namespace.name.concat("#",room.uploader)).emit('signal',signal);
            }
        });
    });
}

app.get('/', function(req, res){
    res.sendFile("public/index.html", {"root": __dirname});
});

app.get('/room/:room', function(req, res){
    var roomFound = false;
    for(var i = 0; i < rooms.length; i++) {
        if(rooms[i].id == (req.params.room)) {
            res.sendFile("public/index.html", {"root": __dirname});
            roomFound = true;
        }
    }
    if(!roomFound) {
        res.sendStatus(404);
    }

});

app.get('/addRoom', function(req, res){
    var roomId = uuid.v1();
    rooms.push(new Room(roomId));
    res.json('{"roomId":"' + roomId + '"}');
});

http.listen(8080, function(){
    console.log('listening on *:8080');
});