function signaller() {
    var stompClient = null;
    var roomUrl = null;

    this.connect = function(roomId, user, onsignal, onsuccess) {
        var socket = new SockJS('/signal');
        stompClient = Stomp.over(socket);
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

    this.createNewRoom = function() {
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

    this.createNewUser = function(roomId) {
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
}