module.exports = function() {
    var client = null;
    var roomUrl = null;
    var $ = require('jquery');


    this.connect = function(roomId, user, onsignal, onsuccess) {
        client = require('socket.io-client');
        client.on('connect', function (frame) {
            client.subscribe('/topic/' + roomId, function(data) {
                onsignal(data);
            });
            roomUrl = "/app/signal/" + roomId;
            onsuccess();
        });
    };

    this.disconnect = function() {
        if (client != null) {
            client.disconnect();
        }
        console.log("Disconnected");
    };

    this.send = function(userId, signal) {
            stompClient.send(roomUrl, {}, signal);
    };

    this.addRoom = function() {
        var result = null;
        $.ajax({
            url: "/addRoom",
            async: false,
            success: function (data) {
                result = data;
            }
        });
        return JSON.parse(result);
    };

    this.removeRoom = function(roomId) {
        var result = null;
        $.ajax({
            url: "/removeRoom/" + roomId,
            async: false,
            success: function (data) {
                result = data;
            }
        });
        return result;
    }

    this.addUser = function(roomId) {
        var result = null;
        $.ajax({
            url: "/"+ roomId +"/addUser",
            async: false,
            success: function (data) {
                result = data;
            }
        });
        return result;
    }

    this.removeUser = function(roomId, userId) {
        var result = null;
        $.ajax({
            url: "/"+ roomId +"/addUser/" + userId,
            async: false,
            success: function (data) {
                result = data;
            }
        });
        return result;
    }
}