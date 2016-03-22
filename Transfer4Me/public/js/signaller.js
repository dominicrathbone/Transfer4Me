module.exports = function() {
    var socket = null;
    var $ = require('jquery');

    this.connect = function(roomId, onsignal, onsuccess) {
        socket = require('socket.io-client')("/room/" + roomId);
        socket.on('connect', function() {
            onsuccess(socket.id);
        })
        socket.on('signal', function(data) {
            onsignal(data);
        });
    };

    this.disconnect = function() {
        if (socket != null) {
            socket.disconnect();
        }
        console.log("Disconnected");
    };

    this.send = function(userId, signal) {
        socket.emit('signal', signal);
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
            url: "/"+ roomId +"/removeUser/" + userId,
            async: false,
            success: function (data) {
                result = data;
            }
        });
        return result;
    }
}