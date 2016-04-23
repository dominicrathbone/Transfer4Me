var express = require('express');
var uuid = require('node-uuid');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var fs = require('fs');
var app = express();
var io;

var production = process.argv.indexOf("-p");
if (production != -1) {
    var https = require('https').createServer({
            key: fs.readFileSync('certificate/transfer4me.key'),
            cert: fs.readFileSync('certificate/www_transfer4_me.crt'),
            ca: [fs.readFileSync('certificate/www_transfer4_me.ca-bundle')]}
        , app);
    https.listen(443, function () {
        console.log('listening on *:443');
    });
    io = require('socket.io')(https);
} else {
    var http = require('http').Server(app);
    http.listen(80, function () {
        console.log('listening on *:80');
    });
    io = require('socket.io')(http);
}

app.use(express.static(__dirname + '/public/'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());

var baseUrl = "/room/"
var rooms = [];

function Room(id, password) {
    this.namespace = io.of(baseUrl.concat(id));
    this.id = id;
    if (password) {
        this.password = password;
    }
    this.uploader = null;
    this.users = 0;
    this.fileType;
    var date = new Date();
    var dateString = "-" + date.getUTCDate() + "-" + date.getUTCMonth() + "-" + date.getUTCFullYear();
    console.log(dateString);

    this.logFile = fs.createWriteStream('./logs/stats/logfile' + dateString + '.json', {flags: 'a'});

    var room = this;

    this.namespace.on('connection', function (socket) {
        if (!room.uploader) {
            room.uploader = socket.client.id;
        } else {
            room.users++;
            room.namespace.to(room.namespace.name.concat("#", room.uploader)).emit('signal', JSON.stringify({
                'user': "SERVER",
                'toUser': room.uploader,
                "users": room.users
            }));
        }

        console.log(socket.client.id + " connected to room: " + room.id);

        socket.on('disconnect', function () {
            console.log(socket.client.id + " disconnected from room: " + room.id);
            if (this.client.id == room.uploader) {
                for (var i = 0; i < rooms.length; i++) {
                    if (rooms[i].uploader == this.client.id) {
                        rooms.splice(i, 1);
                        break;
                    }
                }
            } else {
                room.users--;
                room.namespace.to(room.namespace.name.concat("#", room.uploader)).emit('signal', JSON.stringify({
                    'user': "SERVER",
                    'toUser': room.uploader,
                    "users": room.users
                }));
            }
        });

        socket.on('signal', function (signal) {
            var parsedSignal = JSON.parse(signal);
            console.log(signal);
            if (parsedSignal.toUser) {
                room.namespace.to(room.namespace.name.concat("#", parsedSignal.toUser.userId)).emit('signal', signal);
            } else {
                room.namespace.to(room.namespace.name.concat("#", room.uploader)).emit('signal', signal);
            }
        });

        socket.on('fileType', function (fileType) {
            if(room.fileType == null) {
                room.fileType = JSON.parse(fileType).fileType;
            }
        });

        socket.on('stats', function(stats) {
            room.logFile.write(stats);
        });

    });
}

app.get('/', function (req, res) {
    res.sendFile("public/index.html", {"root": __dirname});
});

app.get('/room', function (req, res) {
    var roomId = uuid.v1();
    var password;
    if (req.query.passworded) {
        var randomString = require('just.randomstring');
        password = randomString();
    }

    rooms.push(new Room(roomId, password));

    var result = new Object();
    result.roomId = roomId;
    result.password = password;
    res.status(201);
    res.json(JSON.stringify(result));
});

app.get('/room/:room', function (req, res) {
    var roomFound = false;
    findRoom(req.params.room, function (room) {
        roomFound = true;
        if (room.password == null || room.password == req.cookies.password) {
            res.sendFile("public/index.html", {"root": __dirname});
        } else if (room.password !== null) {
            res.sendFile("public/password.html", {"root": __dirname});
        }
    });

    if (!roomFound) {
        res.redirect("/");
    }
});

app.get('/room/:room/fileType', function (req, res) {
    findRoom(req.params.room, function (room) {
        if(room.fileType != null) {
            res.status(200);
            res.json(JSON.stringify({"fileType" : room.fileType}));
        }
    });
});

app.post('/room/:room/password', function (req, res) {
    findRoom(req.params.room, function (room) {
        var password = req.body.password;
        if (room.password == password) {
            res.cookie("password", password);
            var result = new Object();
            result.accepted = true;
            result.roomId = room.id;
            res.status(200);
            res.json(JSON.stringify(result));
        } else {
            res.sendStatus(401);
        }
    });
});

function findRoom(roomId, foundCallback) {
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i] !== null && rooms[i] !== undefined && rooms[i].id == roomId) {
            foundCallback(rooms[i]);
            return;
        }
    }
}






