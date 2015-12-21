function signaller() {
    var stompClient = null;
    var roomUrl = null;
    var that = this;

    this.connect = function(roomId, isUploader) {
        var socket = new SockJS('/signal');
        stompClient = Stomp.over(socket);
        stompClient.connect({}, function (frame) {
            console.log('Connected: ' + frame);
            if(isUploader) {
                stompClient.subscribe('/topic/' + roomId + 'u', function(data) {
                    that.onSignal(data);
                });
                roomUrl = "/app/signal/" + roomId;
            } else {
                stompClient.subscribe('/topic/' + roomId, function(data) {
                    that.onSignal(data);
                });
                roomUrl = "/app/signal/" + roomId + 'u';
            }
            startSession(isUploader, roomId);
        });
    };

    this.onSignal = function(data) {
        var signal = JSON.parse(data.body);
        if (signal.sdp) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), answerOffer, logErrorToConsole);
        } else if (signal.candidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }

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