//@sourceURL=app.js
var Dropzone = require('dropzone');
global.$ = global.jQuery = require('jquery');
require("what-input");
require('./foundation.min.js');
var p2p = require('./p2p.js');
var p2pChannel = new p2p();
var content = $("#content");

function User(userId, userType) {
    this.userId = userId;
    this.userType = userType;
}

$(document).ready(function () {
    $(document).foundation();
    var roomId = checkPathForRoomID();
    if (roomId === null) {
        setFileUploadState(roomId);
    } else {
        setJoinRoomState(roomId);
    }
});

function setFileUploadState(roomId) {
    var fileInput = $("<div id='fileInput' class='fileInput'><p id='upload-text'>Drag and drop (or click) to upload.</p></div>");
    content.append(fileInput);
    var dropzone = new Dropzone("div#fileInput", {url: "#", maxFiles: 1});
    dropzone.on("maxfilesexceeded", function(file) {
        this.removeFile(file);
    });
    dropzone.on("addedfile", function (file) {
        if (file != null) {
            $('.dz-preview').remove();
            p2pChannel.startSession(roomId, new User(null, p2pChannel.UserType.UPLOADER), file, function (roomId) {
                $("#app").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function () {
                    fileInput.remove();
                    setNewRoomState(roomId, file.name);
                    $("#app").removeClass("bounceOutThenIn");
                });
                $("#app").addClass("bounceOutThenIn");
            });
        }
        else {
            alert("Upload valid file");
        }
    });
    content.append($("<audio></audio>"));
}

function setNewRoomState(roomId, fileName) {
    var roomUrl = "" + window.location.href + "room/" + roomId;
    history.pushState(null, null, roomUrl);
    var roomContainer = $("<div id='room' class='room'></div>");
    roomContainer.append($("<p class='subtitle'>You have uploaded " + fileName + "</p>"));
    roomContainer.append($("<p id='users'>0 user(s) connected to you.</p>"));
    roomContainer.append($("<p>Remember you can only share it as long as you have this page open.</p>"));
    var shareContainer = $("<div id='share' class='share'></div>");
    roomContainer.append($("<p>Share URL: <p class='shareUrl'> " + roomUrl + "</p></p>"));
    shareContainer.append($("<a id='facebook' class='shareBtn' target='_blank' href='https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(roomUrl) + "'></a>"));
    shareContainer.append($("<a id='twitter' class='shareBtn' target='_blank' href='https://twitter.com/home?status=" + encodeURIComponent(roomUrl) + "'></a>"));
    shareContainer.append($("<a id='google' class='shareBtn' target='_blank' href='https://plus.google.com/share?url=" + encodeURIComponent(roomUrl) + "'></a>"));
    roomContainer.append(shareContainer);
    content.append(roomContainer);
}

function setJoinRoomState(roomId) {
    var roomContainer = $("<div id='room' class='room rowedState'></div>")
    var audioPlayerElement = $("<audio class='hidden' controls='true' id='audioPlayer'></audio>");
    var downloadButton = $("<div class='joinedIcon'><input type='button' id='downloadButton' class='downloadButton'><p class='subtitle'>Download</p></input></div>");
    downloadButton.click(function () {
        p2pChannel.startSession(roomId, new User(null, p2pChannel.UserType.DOWNLOADER), null, setDownloadState);
    });
    var streamButton = $("<div class='joinedIcon'><input type='button' id='streamButton' class='streamButton'><p class='subtitle'>Stream</p></input></div>");
    streamButton.click(function () {
        p2pChannel.startSession(roomId, new User(null, p2pChannel.UserType.STREAMER), null, setStreamingState);
    });
    roomContainer.append(audioPlayerElement);
    roomContainer.append(downloadButton);
    roomContainer.append(streamButton);
    content.append(roomContainer);
}

function setDownloadState() {
    var roomContainer = $('.room');
    roomContainer.empty();
    roomContainer.removeClass("rowedState");
    roomContainer.append($("<p id='progress-text' class='subtitle'>File is downloading...</p>"));
    roomContainer.append($('<progress max="100" value="0"></progress>'));
}

function setStreamingState() {
    $('.joinedIcon').remove();
    $('#audioPlayer').removeClass('hidden');
}

function checkPathForRoomID() {
    var roomId = window.location.pathname.split("/")[2];
    if (roomId !== null && roomId !== "" && typeof roomId !== "undefined") {
        return roomId;
    }
    return null;
}

module.exports.logErrorToConsole = function logErrorToConsole(error) {
    console.error(error);
}


