module.exports = function () {
    var socket = null;

    this.connect = function (roomId, onsignal, onsuccess) {
        socket = require('socket.io-client')("/room/" + roomId);
        socket.on('connect', function () {
            onsuccess(socket.id);
        })
        socket.on('signal', function (data) {
            onsignal(data);
        });
    };

    this.disconnect = function () {
        if (socket != null) {
            socket.disconnect();
        }
        console.log("Disconnected");
    };

    this.send = function (signal) {
        socket.emit('signal', signal);
    };

    this.addRoom = function (passworded) {
        var result = null;
        var url ="/room";
        if(passworded) {
            url = url.concat("?passworded=true")
        }
        $.ajax({
            url: url,
            async: false,
            success: function (data) {
                result = data;
            }
        });
        return JSON.parse(result);
    };


}