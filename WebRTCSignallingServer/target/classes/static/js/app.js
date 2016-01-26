var roomId = checkPathForRoomID();
var p2pChannel = new p2p();
var UserType = {
    UPLOADER: 0,
    DOWNLOADER: 1,
    STREAMER: 2
}
var user = {
    userId: null,
    userType: null
};

document.addEventListener("DOMContentLoaded", function() {
    if(roomId == null) {
        setFileUploadState();
    } else {
        setJoinRoomState();
    }
});

function setFileUploadState() {
    var fileInput = document.createElement('input');
    fileInput.id="fileInput";
    fileInput.className="fileInput";
    fileInput.type="file";
    fileInput.addEventListener('change', function () {
        var file = this.files[0];
        if (file != null) {
            user.userType = UserType.UPLOADER;
            p2pChannel.startSession(roomId, user, file);
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
}

function setJoinRoomState() {
    var downloadFileButton = document.createElement("input");
    downloadFileButton.type = "button";
    downloadFileButton.id="downloadFileButton";
    downloadFileButton.value="Download File";
    downloadFileButton.addEventListener("click", function() {
        user.userType = UserType.DOWNLOADER;
        p2pChannel.startSession(roomId, user, null, setDownloadState());
    });
    var streamFileButton = document.createElement("input");
    streamFileButton.type = "button";
    streamFileButton.id="streamFileButton";
    streamFileButton.value="Stream File";
    streamFileButton.addEventListener("click", function() {
        user.userType = UserType.STREAMER;
        p2pChannel.startSession(roomId, user, null, setStreamingState());
    });
    document.getElementById('container').appendChild(downloadFileButton);
    document.getElementById('container').appendChild(streamFileButton);

}

function setDownloadState() {
    var downloadingFileTextNode = document.createTextNode("FILE IS DOWNLOADING...");
    document.getElementById('container').appendChild(downloadingFileTextNode);
}

function setStreamingState() {
    var audioPlayerElement = document.createElement("AUDIO");
    audioPlayerElement.controls = true;
    audioPlayerElement.id = "audioPlayer";
    document.getElementById('container').appendChild(audioPlayerElement);
    var videoPlayerElement = document.createElement("VIDEO");
    videoPlayerElement.controls = true;
    videoPlayerElement.id = "videoPlayer";
    document.getElementById('container').appendChild(videoPlayerElement);
}

function checkPathForRoomID() {
    var pathname = window.location.pathname;
    var roomId = pathname.split("/")[1];
    if(roomId != null && roomId != "") {
        return roomId;
    }
    return null;
}

function logErrorToConsole(error) {
    console.error(error);
}

