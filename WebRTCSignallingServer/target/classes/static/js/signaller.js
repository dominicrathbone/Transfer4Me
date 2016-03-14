function Signaller() {
    var stompClient = null;
    var roomUrl = null;

    this.connect = function(roomId, user, onsignal, onsuccess) {
        var socket = new SockJS('/signal');
        stompClient = Stomp.over(socket);
        //stompClient.debug = null;
        stompClient.connect({}, function (frame) {
            var headers = {'selector' : user.userId.toString()};
            console.log(headers);
            stompClient.subscribe('/user/' + user.userId + '/topic/' + roomId, function(data) {
                onsignal(data);
            }, headers);
            roomUrl = "/app/signal/" + roomId;
            onsuccess();
        });
    };

    this.disconnect = function() {
        if (stompClient != null) {
            stompClient.disconnect();
        }
        console.log("Disconnected");
    };

    this.send = function(userId, signal) {
        if(userId != null) {
            var headers = {'selector': userId.toString()};
            console.log(headers);
            stompClient.send(roomUrl, headers, signal);
        } else {
            stompClient.send(roomUrl, {}, signal);
        }
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