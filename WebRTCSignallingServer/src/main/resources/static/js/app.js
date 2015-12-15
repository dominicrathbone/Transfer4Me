var connected = 0;
var roomId = null;

document.addEventListener("DOMContentLoaded", function(event) {

    document.getElementById('room').style.display = 'none';

    document.getElementById('connectButton').onclick = function(){
        if(connected == 0) {
            setConnected();
        } else if(connected == 1) {
            setDisconnected();
        }
    };

    document.getElementById('sendMessageButton').onclick = function(){ 
        var message = document.getElementById('message').value;
        sendMessage(roomId, message);
    };
    
});

function setConnected() {
    roomId = checkPathForRoomID();
    var roomUrl = "" + window.location.href;
    if(roomId == null) {
        roomId = createNewRoom();
        roomUrl = "" + window.location.href + roomId;
        history.pushState(null,null,roomUrl);
        var roomUrlTextNode = document.createTextNode("Room URL:");
        var roomUrlElement = document.createElement("textarea");
        roomUrlElement.setAttribute("readOnly","true"); 
        roomUrlElement.value = roomUrl;
        document.getElementById("roomUrlContainer").appendChild(roomUrlTextNode);
        document.getElementById("roomUrlContainer").appendChild(roomUrlElement);
    }
    connect(roomId);
    document.getElementById('connectButton').value = "Disconnect";
    document.getElementById('room').style.display = 'block';
    connected = 1;
}

function setDisconnected() {
    disconnect();
    document.getElementById('connectButton').value = "Connect";
    document.getElementById('room').style.display = 'none';
    document.getElementById('messenger').value = null;
    connected = 0;
}

function updateMessageList(message) {
    console.log(message);
    var messageElement = document.createElement("li"); 
    var messageText = document.createTextNode(message);  
    messageElement.appendChild(messageText);
    document.getElementById('messageList').appendChild(messageElement);
}

function checkPathForRoomID() {
    var pathname = window.location.pathname;
    var roomId = pathname.split("/")[1];
    if(roomId != null && roomId != "") {
        return roomId;
    }
    return null;
}



