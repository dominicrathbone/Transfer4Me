function Signaller() {
    var stompClient = null;
    var roomUrl = null;

    this.connect = function(roomId, user, onsignal, onsuccess) {
        var socket = new SockJS('/signal');
        stompClient = Stomp.over(socket);
        stompClient.debug = null;
        stompClient.connect({}, function (frame) {
            console.log('Connected: ' + frame);
            if(user.userType == UserType.UPLOADER) {
                stompClient.subscribe('/topic/' + roomId + 'u', function(data) {
                    onsignal(data);
                });
                roomUrl = "/app/signal/" + roomId;
            } else {
                stompClient.subscribe('/topic/' + roomId, function(data) {
                    onsignal(data);
                });
                roomUrl = "/app/signal/" + roomId + 'u';
            }
            onsuccess();
        });
    };

    this.disconnect = function() {
        if (stompClient != null) {
            stompClient.disconnect();
        }
        console.log("Disconnected");
    };

    this.send = function(signal) {
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
        return result;
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