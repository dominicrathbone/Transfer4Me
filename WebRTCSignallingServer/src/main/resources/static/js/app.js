var roomId = checkPathForRoomID();
var p2pChannel = new p2p();
var isUploader = false;
var file = null;

document.addEventListener("DOMContentLoaded", function(event) {
    if(roomId == null) {
        setFileUploadState();
    } else {
        isUploader = false;
        p2pChannel.startSession(roomId, isUploader);
        setJoinRoomState();
    }
});

function setFileUploadState() {
    var fileInput = document.createElement('input');
    fileInput.id="fileInput";
    fileInput.type="file";
    fileInput.addEventListener('change', function () {
        file = this.files[0];
        var reader = new window.FileReader();
        reader.readAsArrayBuffer(file);
        if (file != null) {
            isUploader = true;
            p2pChannel.startSession(roomId, isUploader, file);
            roomId = p2pChannel.roomId;
            setNewRoomState();
        }
        else {
            alert("upload valid file");
        }
    });
    document.getElementById("container").appendChild(fileInput);
}


function setNewRoomState() {
    var roomUrl = "" + window.location.href + roomId;
    history.pushState(null,null,roomUrl);
    var roomUrlContainer = document.createElement("div");
    var roomUrlTextNode = document.createTextNode("Room URL:");
    var roomUrlElement = document.createElement("textarea");
    roomUrlElement.setAttribute("readOnly","true");
    roomUrlElement.value = roomUrl;
    roomUrlContainer.appendChild(roomUrlTextNode);
    roomUrlContainer.appendChild(roomUrlElement);
    document.getElementById('container').appendChild(roomUrlContainer);
    document.getElementById('container').style.display = 'block';
}

function setJoinRoomState() {
    var downloadFileButton = document.createElement("input");
    downloadFileButton.type = "button";
    downloadFileButton.id="downloadFileButton";
    downloadFileButton.value="Download File";
    document.getElementById('container').appendChild(downloadFileButton);
}

function checkPathForRoomID() {
    var pathname = window.location.pathname;
    var roomId = pathname.split("/")[1];
    if(roomId != null && roomId != "") {
        return roomId;
    }
    return null;
}

function spliceFile(file) {
    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        if (file === undefined || file === null) {
            logErrorToConsole("file is undefined or null");
        } else {
            var blobs = [];
            var fileSize = file.size;
            var chunkSize = 16;
            if(fileSize > chunkSize) {
                var startByte = 0;
                var endByte = chunkSize;
                while(startByte < fileSize) {
                    var blob = file.slice(startByte, endByte);
                    blobs.push(blob);
                    startByte = endByte;
                    endByte = endByte + chunkSize;
                }
            } else {
                blobs.push(file);
            }
            return blobs;
        }
    } else {
        logErrorToConsole("HTML5 File API is not supported in this browser");
    }
    return null;
}

function logErrorToConsole(error) {
    console.error(error);
}

