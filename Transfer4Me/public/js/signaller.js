var $ = require('jquery');

module.exports = function () {

    //_______ __                     __ __
    //|     __|__|.-----.-----.---.-.|  |  |.-----.----.
    //|__     |  ||  _  |     |  _  ||  |  ||  -__|   _|
    //|_______|__||___  |__|__|___._||__|__||_____|__|
    //
    var socket = null;

    this.connect = function (roomId, onsignal, onsuccess) {
        socket = require('socket.io-client')("/room/" + roomId);
        //On connection, call onsuccess callback
        socket.on('connect', function () {
            onsuccess(socket.id);
        })
        //on signal, call onsignal callback
        socket.on('signal', function (data) {
            onsignal(data);
        });
    };

    //Disconnect from a room
    this.disconnect = function () {
        if (socket != null) {
            socket.disconnect();
        }
        console.log("Disconnected");
    };

    //Emit a signal to the signalling server
    this.send = function(event, signal) {
        socket.emit(event, signal);
    };

    //Fires a request to the add room endpoint
    this.addRoom = function (passworded) {
        var result = null;
        var url ="/room";
        var data = {};
        //if the user selects the password protect option, request a password to be added to the room.
        if(passworded) {
            data.passworded=true;
        }
        $.ajax({
            url: url,
            type:"POST",
            data: data,
            async: false,
            success: function (data) {
                result = data;
            }
        });
        return JSON.parse(result);
    };

    //Get the file type of the file uploaded to the room.
    this.getFileType = function (roomId) {
        var result = null;
        var url ="/room/".concat(roomId, "/fileType");
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