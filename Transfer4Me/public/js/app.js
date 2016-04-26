//@sourceURL=app.js
global.$ = require('jquery');
var Dropzone = require('dropzone');
var p2p = require('./p2p.js');
var p2pChannel = new p2p();
var content = $("#content");

function User(userId, userType) {
    this.userId = userId;
    this.userType = userType;
    if(navigator.webkitGetUserMedia) {
        this.isChrome = true;
    } else if(navigator.mozGetUserMedia) {
        this.isFirefox = true;
    }
}

$(document).ready(function () {
    var roomId = extractRoomIdFromPath();
    if (roomId == null) {
        setFileUploadState();
    } else {
        setJoinRoomState(roomId);
    }
});

$(window).on("beforeunload",function() {
    p2pChannel.endSession();
    window.history.go(-1);
})

function setFileUploadState() {
    var passwordFileInput = $("<div id='passwordInput' class='centered row'>" +
        "<input type='checkbox' id='passwordCheckBox'>" +
        "<p id='passwordCheckBoxText' class='bold'>Password protect.</p>" +
        "</div>");
    var fileInput = $("<div id='fileInput' class='fileInput centered column'><img src='../img/arrow.png'/><p id='upload-text'>Drag and drop (or click) to upload.</p></div>");
    content.append(passwordFileInput);
    content.append(fileInput);

    var dropzone = new Dropzone("div#fileInput", {url: "#", maxFiles: 1});
    dropzone.on("addedfile", function (file) {
        $('.dz-preview').remove();
        var passworded = $("#passwordCheckBox").is(':checked');
        p2pChannel.startSession(null, passworded, new User(null, p2pChannel.UserType.UPLOADER), file, function (roomId, password, bytesReceivedByStreamers, bytesReceivedByDownloaders) {
            $("#app").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function () {
                passwordFileInput.remove();
                fileInput.remove();
                setNewRoomState(roomId, password, file.name);
                if(document.querySelector("audio").canPlayType(file.type) !== "") {
                    bytesReceivedByStreamers.streamTo(document.getElementById("bytesReceivedByStreamers"));
                } else {
                    $("#bytesReceivedByStreamers").remove();
                    $("#bytesReceivedByStreamersText").remove();
                }
                bytesReceivedByDownloaders.streamTo(document.getElementById("bytesReceivedByDownloaders"));
                $("#app").removeClass("bounceOutThenIn");
            });
            $("#app").addClass("bounceOutThenIn");
        });
    });
    content.append($("<audio></audio>"));
}

function setNewRoomState(roomId, password, fileName) {
    var roomUrl = "" + window.location.href + "room/" + roomId;
    history.pushState(null, null, roomUrl);
    var roomContainer = $("<div id='room' class='room column'></div>");
    roomContainer.append($("<p class='bold'>You have uploaded " + fileName + "</p>"));
    roomContainer.append($("<p id='users'>0 user(s) connected to you.</p>"));
    roomContainer.append($("<p>Remember you can only share it as long as you have this page open.</p>"));
    roomContainer.append($("<p>Share URL:</p><p class='shareUrl'> " + roomUrl + "</p>"));
    if(password) {
        roomContainer.append($("<p>Password: <p class='shareUrl'>" + password + "</p></p>"));
    }
    var shareContainer = $("<div id='shareContainer'></div>");
    shareContainer.append($("<a id='facebook' class='shareBtn' target='_blank' href='https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(roomUrl) + "'></a>"));
    shareContainer.append($("<a id='twitter' class='shareBtn' target='_blank' href='https://twitter.com/home?status=" + encodeURIComponent(roomUrl) + "'></a>"));
    shareContainer.append($("<a id='google' class='shareBtn' target='_blank' href='https://plus.google.com/share?url=" + encodeURIComponent(roomUrl) + "'></a>"));
    roomContainer.append(shareContainer);

    var statsContainer = $("<div id='statsContainer' class='centered column'></div>");
    roomContainer.append(statsContainer);
    content.append(roomContainer);

    var canvasWidth = $("#statsContainer").width() * 0.9;
    var canvasHeight = Math.max($("#statsContainer").height() * 0.3, 40);
    statsContainer.append($("<p id = 'bytesReceivedByStreamersText'>Users streaming (Bytes/s)</p>"));
    statsContainer.append('<canvas id="bytesReceivedByStreamers" width="' + canvasWidth +'" height="' + canvasHeight +'" class="statistic"></canvas>');

    statsContainer.append($("<p id = 'bytesReceivedByDownloadersText'>Users downloading (Bytes/s)</p>"));
    statsContainer.append('<canvas id="bytesReceivedByDownloaders"  width="' + canvasWidth +'" height="' + canvasHeight +'" class="statistic"></canvas>');

}

function setJoinRoomState(roomId) {
    var roomContainer = $("<div id='room' class='room row'></div>")
    content.append(roomContainer);

    var downloadButton = $("<di class='icon centered column'><input type='button' id='downloadButton' class='downloadButton'><p class='bold'>Download</p></input></div>");
    downloadButton.click(function () {
        p2pChannel.startSession(roomId, null, new User(null, p2pChannel.UserType.DOWNLOADER), null, setDownloadState);
    });
    roomContainer.append(downloadButton);

    var audioPlayerElement = $("<audio class='hidden' controls='true' id='audioPlayer'></audio>");
    roomContainer.append(audioPlayerElement);
    var fileType = p2pChannel.signallingChannel.getFileType(roomId).fileType;
    if(document.querySelector("audio").canPlayType(fileType) !== "") {
        var streamButton = $("<div class='icon centered column'><input type='button' id='streamButton' class='streamButton'><p class='bold'>Stream</p></input></div>");
        streamButton.click(function () {
            p2pChannel.startSession(roomId, null, new User(null, p2pChannel.UserType.STREAMER), null, setStreamingState);
        });
        roomContainer.append(streamButton);
    }
}

function setDownloadState() {
    var roomContainer = $('.room');
    roomContainer.empty();
    roomContainer.removeClass("row");
    roomContainer.addClass("column");
    roomContainer.append($("<p id='progress-text' class='bold'>File is downloading...</p>"));
    roomContainer.append($('<progress max="100" value="0"></progress>'));
}

function setStreamingState() {
    $('.icon').remove();
    $('#audioPlayer').removeClass('hidden');
}

function extractRoomIdFromPath() {
    var roomId = window.location.pathname.split("/")[2];
    if (roomId !== null && roomId !== "" && typeof roomId !== "undefined") {
        return roomId;
    }
    return null;
}

module.exports.logErrorToConsole = function logErrorToConsole(error) {
    console.error(error);
}


