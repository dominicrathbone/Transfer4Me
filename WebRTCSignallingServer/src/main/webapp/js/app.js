
document.addEventListener("DOMContentLoaded", function(event) { 
    
    var connected = 0;
    var roomId = null;
    
    document.getElementById('messager').style.display = 'none';  
    
    document.getElementById('connectButton').onclick = function(){
        roomId = document.getElementById('roomId').value;
        if(connected == 0) {
            connect(roomId);
            document.getElementById('roomId').disabled = true;
            document.getElementById('connectButton').value = "Disconnect";
            document.getElementById('messager').style.display = 'block';          
            connected = 1;
        }
        else if(connected == 1) {
            disconnect();
            document.getElementById('roomId').disabled = false;
            document.getElementById('connectButton').value = "Connect";
            document.getElementById('messager').style.display = 'none';
            document.getElementById('message').value = null;
            connected = 0;
        }
    };
    
    document.getElementById('sendMessageButton').onclick = function(){ 
        var message = document.getElementById('message').value;
        sendMessage(roomId, message);
    };
    
});

function updateMessageList(message) {
    console.log(message);
    var messageElement = document.createElement("li"); 
    var messageText = document.createTextNode(message);  
    messageElement.appendChild(messageText);
    document.getElementById('messageList').appendChild(messageElement);
}

