var express = require('express');
var uuid = require('node-uuid');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public/'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

var baseUrl = "/room/"
var rooms = [];

function Room(id, password) {
    this.namespace = io.of(baseUrl.concat(id));
    this.id = id;
    if(password) {
        this.password = password;
    }
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
                        break;
                    }
                }
            } else {
                room.users--;
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
            roomFound = true;
            if(rooms[i].password == req.cookies.password) {
                res.sendFile("public/index.html", {"root": __dirname});
                break;
            } else if(rooms[i].password !== null) {
                res.sendFile("public/password.html", {"root": __dirname});
                break;
            }
        }
    }

    if(!roomFound) {
        res.sendStatus(404);
    }
});

app.get('/room', function(req, res){
    var roomId = uuid.v1();
    var password;
    if(req.query.passworded) {
        var randomString = require('just.randomstring');
        password = randomString();
    }

    rooms.push(new Room(roomId, password));

    var result = new Object();
    result.roomId = roomId;
    result.password = password;

    res.json(JSON.stringify(result));
});

app.post('/room/:room/password', function(req, res){
    for(var i = 0; i < rooms.length; i++) {
        if(rooms[i].id == (req.params.room)) {
            var password = req.body.password;
            if(rooms[i].password == password) {
                res.cookie("password", password);
                var result = new Object();
                result.accepted = true;
                result.roomId = rooms[i].id;
                res.json(JSON.stringify(result));
                break;
            } else {
                res.sendStatus(401);
                break;
            }
        }
    }
});

http.listen(8080, function(){
    console.log('listening on *:8080');
});