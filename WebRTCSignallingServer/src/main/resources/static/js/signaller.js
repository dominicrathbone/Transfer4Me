function signaller() {
    var stompClient = null;
    var roomUrl = null;

    this.connect = function(roomId, isUploader, onsignal, onsuccess) {
        var socket = new SockJS('/signal');
        stompClient = Stomp.over(socket);
        stompClient.connect({}, function (frame) {
            console.log('Connected: ' + frame);
            if(isUploader) {
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
            url: "/newRoom",
            async: false,
            success: function (data) {
                result = data;
            }
        });
        return result;
    };
}