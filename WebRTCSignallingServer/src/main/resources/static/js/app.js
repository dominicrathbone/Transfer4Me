var roomId = checkPathForRoomID();
var signallingChannel = new signaller();
var isUploader = false;

document.addEventListener("DOMContentLoaded", function(event) {
    if(roomId == null) {
        setFileUploadState();
    } else {
        isUploader = false;
        signallingChannel.connect(roomId, isUploader);
        setJoinRoomState();
    }
});

function setFileUploadState() {
    var fileInput = document.createElement('input');
    fileInput.id="fileInput";
    fileInput.type="file";
    fileInput.addEventListener('change', function () {
        if (handleFile(this.files[0])) {
            roomId = signallingChannel.createNewRoom();
            isUploader = true;
            signallingChannel.connect(roomId, isUploader);
            setNewRoomState();
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

function handleFile(file) {
    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        if (file === undefined || file === null) {
            logErrorToConsole("file is undefined or null");
        } else {
            var fileSize = file.size;
            var chunkSize = 16;
            if(fileSize > chunkSize) {
                var blobs = [];
                var startByte = 0;
                var endByte = chunkSize;
                while(startByte < fileSize) {
                    var blob = file.slice(startByte, endByte);
                    blobs.push(blob);
                    startByte = endByte;
                    endByte = endByte + chunkSize;
                }
            }
            return true;
        }

    } else {
        logErrorToConsole("HTML5 File API is not supported in this browser");
    }
    return false;
}

function logErrorToConsole(error) {
    console.error(error);
}

