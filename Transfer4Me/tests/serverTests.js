/**
 * Created by Dominic on 29/04/2016.
 */
require('mocha');
var io = require('socket.io-client');
var testRequest = require('supertest');
var sendRequest = require('request');

describe("Server Tests",function(){
    var serverURL = "http://localhost:80";
    it('should create room', function(done){
        var request = testRequest(serverURL);
        request.post("/room").expect(201, done);
    });
    it('should create room with password', function(done){
        sendRequest.post(serverURL + "/room", {form:{'passworded':'true'}}, function(err, res, body) {
            body = JSON.parse(JSON.parse(body));
            var roomId = body.roomId;
            var password = body.password;
            var request = testRequest(serverURL);
            request.post("/room/" + roomId + "/password")
                .send({ 'password' : password })
                .expect(200, done);
        });
    });
    it('should find room', function(done){
        sendRequest.post(serverURL + "/room", function(err, res, body) {
            body = JSON.parse(JSON.parse(body));
            var roomId = body.roomId;
            var request = testRequest(serverURL);
            request.get("/room/" + roomId).expect(200, done);
        });
    });
    it('should join room via WebSockets', function(done) {
        sendRequest.post(serverURL + "/room", function(err, res, body) {
            body = JSON.parse(JSON.parse(body));
            var roomId = body.roomId;
            var socket = io(serverURL + "/room/" + roomId);
            socket.on('connect', function() {
                done();
            });
        });
    });
    it('should send signal via WebSockets', function(done) {
        sendRequest.post(serverURL + "/room", function(err, res, body) {
            body = JSON.parse(JSON.parse(body));
            var roomId = body.roomId;
            var socket = io(serverURL + "/room/" + roomId);
            var socket2 = io(serverURL + "/room/" + roomId);
            socket.on('signal', function(signal) {
                signal = JSON.parse(signal);
                if(signal.hey == sentSignal.hey) {
                    done();
                } else if(!signal.users) {
                    throw new Error("signal is not as expected");
                }
            });
            var sentSignal = {
                user: socket2.id,
                toUser: socket.id,
                hey: "world"
            };
            socket2.on('connect', function() {
                socket2.emit("signal", JSON.stringify(sentSignal));
            });
        });
    });
    it('should add file type to room', function(done) {
        sendRequest.post(serverURL + "/room", function(err, res, body) {
            body = JSON.parse(JSON.parse(body));
            var roomId = body.roomId;
            var socket = io(serverURL + "/room/" + roomId);
            var fileType = "image/jpeg";
            socket.on('connect', function() {
                socket.emit('metadata', JSON.stringify({
                    fileType: "image/jpeg",
                    fileSize: "234234"
                }));
                var request = testRequest(serverURL);
                request.get("/room/" + roomId + "/fileType")
                    .expect(function(res) {
                        if(JSON.parse(res.body).fileType !== fileType) {
                            throw new Error("did not return correct fileType");
                        }
                    })
                    .expect(200, done);
            });
        });
    });
});
