var roomId = checkPathForRoomID();
var p2pChannel = new P2p();
var UserType = {
    UPLOADER: 0,
    DOWNLOADER: 1,
    STREAMER: 2
};

function User(userId, userType) {
    this.userId = userId;
    this.userType = userType;
}

document.addEventListener("DOMContentLoaded", function() {
    if(roomId === null) {
        setFileUploadState();
    } else {
        setJoinRoomState();
    }
});

function setFileUploadState() {
    var fileInput = document.createElement('input');
    fileInput.id = "fileInput";
    fileInput.className = "fileInput";
    fileInput.type = "file";
    fileInput.addEventListener('change', function () {
        var file = this.files[0];
        if (file != null) {
            p2pChannel.startSession(roomId, new User(null, UserType.UPLOADER), file);
            roomId = p2pChannel.roomId;
            setNewRoomState();
        }
        else {
            alert("upload valid file");
        }
    });
    document.getElementById("container").appendChild(document.createElement("audio"));
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
    document.getElementById('container').removeChild(document.getElementById('fileInput'));
}

function setJoinRoomState() {
    var downloadFileButton = document.createElement("input");
    downloadFileButton.type = "button";
    downloadFileButton.id = "downloadFileButton";
    downloadFileButton.value = "Download File";
    downloadFileButton.addEventListener("click", function() {
        p2pChannel.startSession(roomId, new User(null, UserType.DOWNLOADER), null);
        setDownloadState();
    });
    var streamFileButton = document.createElement("input");
    streamFileButton.type = "button";
    streamFileButton.id = "streamFileButton";
    streamFileButton.value = "Stream File";
    streamFileButton.addEventListener("click", function() {
        p2pChannel.startSession(roomId, new User(null, UserType.STREAMER), null);
        setStreamingState();
    });
    document.getElementById('container').appendChild(downloadFileButton);
    document.getElementById('container').appendChild(streamFileButton);

}

function setDownloadState() {
    var downloadingFileTextNode = document.createTextNode("FILE IS DOWNLOADING...");
    document.getElementById('container').appendChild(downloadingFileTextNode);
}

function setStreamingState() {
    var audioPlayerElement = document.createElement("audio");
    audioPlayerElement.controls = true;
    audioPlayerElement.id = "audioPlayer";
    document.getElementById('container').appendChild(audioPlayerElement);
    //var videoPlayerElement = document.createElement("video");
    //videoPlayerElement.controls = true;
    //videoPlayerElement.id = "videoPlayer";
    //document.getElementById('container').appendChild(videoPlayerElement);
}

function checkPathForRoomID() {
    var roomId = window.location.pathname.split("/")[1];
    if(roomId !== null && roomId !== "") {
        return roomId;
    }
    return null;
}

function logErrorToConsole(error) {
    console.error(error);
}

