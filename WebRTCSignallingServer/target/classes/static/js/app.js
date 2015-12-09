var connected = 0;
var roomId = null;


document.addEventListener("DOMContentLoaded", function(event) {   
    document.getElementById('room').style.display = 'none';  

    document.getElementById('connectButton').onclick = function(){
        roomId = Math.floor((Math.random() * 100) + 1);
        if(connected == 0) {
            setConnected(roomId);
        } else if(connected == 1) {
            setDisconnected();
        }
    };
    
    document.getElementById('sendMessageButton').onclick = function(){ 
        var message = document.getElementById('message').value;
        sendMessage(roomId, message);
    };
    
});

//window.addEventListener('popstate', function(e) {
//    alert(e.state);
//});

function setConnected(roomId) {
    connect(roomId);
    document.getElementById('connectButton').value = "Disconnect";
    document.getElementById('room').style.display = 'block';  
//  history.pushState(roomId, roomId, window.location.href + roomId);
    connected = 1;
}

function setDisconnected() {
    disconnect();
    document.getElementById('connectButton').value = "Connect";
    document.getElementById('room').style.display = 'none';
    document.getElementById('messager').value = null;
    connected = 0;
}

function updateMessageList(message) {
    console.log(message);
    var messageElement = document.createElement("li"); 
    var messageText = document.createTextNode(message);  
    messageElement.appendChild(messageText);
    document.getElementById('messageList').appendChild(messageElement);
}




