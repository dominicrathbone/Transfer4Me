var stompClient = null;

function connect(roomId) {
    var socket = new SockJS('/signal');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function(frame) {
        console.log('Connected: ' + frame);
        stompClient.subscribe('/topic/' + roomId, function(message){
            console.log(message);
        });
    });
}

function disconnect() {
    if (stompClient != null) {
        stompClient.disconnect();
    }
    console.log("Disconnected");
}

function sendMessage(roomId, message) {
    stompClient.send("/app/signal/" + roomId, {}, JSON.stringify({ 'message': message }));
}

