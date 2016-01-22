function p2p() {
    this.peerConnection = {
        user: null,
        peerConnection: null
    };
    this.peerConnections = []
    this.dataChannel;
    this.signallingChannel;
    this.roomId = null;
    this.fileName = null;
    this.file = null;
    var that = this;

    this.startSession = function(roomId, user, file) {
        that.signallingChannel = new signaller();
        if(roomId == null) {
            roomId = that.signallingChannel.createNewRoom();
        }
        that.roomId = roomId;
        if(user.userId == null) {
            user.userId == that.signallingChannel.createNewUser(roomId);
        }
        that.peerConnection.user = user;

        that.signallingChannel.connect(roomId, user, that.onSignal, function() {

            that.peerConnection.peerConnection = new RTCPeerConnection(
                {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]},
                null
            );

            that.peerConnection.peerConnection.onicecandidate = function (event) {
                that.signallingChannel.send(JSON.stringify({"candidate": event.candidate}));
            };

            if(user.userType == UserType.DOWNLOADER || user.userType == UserType.STREAMER) {
                if (user.userType == UserType.DOWNLOADER) {
                    openDataChannel(roomId);
                } else if (user == UserType.STREAMER) {
                    prepareForMediaStream();
                }
                sendOffer();
            } else if(user.userType == UserType.UPLOADER) {
                that.file = file;
                that.fileName = file.name;
                that.peerConnections.push(that.peerConnection);
                prepareForDataChannel(file);
            }
        });
    };

    this.answerOffer = function(callback) {
        if(that.peerConnection.peerConnection.remoteDescription.type == 'offer') {
            that.peerConnection.peerConnection.createAnswer(function (description) {
                that.peerConnection.peerConnection.setLocalDescription(description, function () {
                    that.signallingChannel.send(JSON.stringify({
                        'sdp': that.peerConnection.peerConnection.localDescription
                    }));
                    if(callback !=  null) {
                        callback();
                    }
                }, logErrorToConsole);
            }, logErrorToConsole);
        }
    };

    this.onSignal = function(data) {
        console.log(data);
        var signal = JSON.parse(data.body);
        console.log(signal);
        if (signal.sdp) {
            if(signal.user && signal.user.userType == UserType.STREAMER) {
                sendMediaStream(signal);
            } else {
                that.peerConnection.peerConnection.setRemoteDescription(
                    new RTCSessionDescription(signal.sdp),
                    that.answerOffer,
                    logErrorToConsole
                );
            }
        } else if (signal.candidate) {
            that.peerConnection.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }

    this.sendNewMediaStreamOffer = function(stream) {
        that.peerConnection.peerConnection.addStream(stream);
        sendOffer();
    }

    function sendOffer() {
        that.peerConnection.peerConnection.createOffer(function (description) {
            that.peerConnection.peerConnection.setLocalDescription(description, function () {
                that.signallingChannel.send(JSON.stringify({
                    'user': that.peerConnection.user,
                    'sdp': that.peerConnection.peerConnection.localDescription
                }));
            }, logErrorToConsole);
        }, logErrorToConsole, {"offerToReceiveAudio":true,"offerToReceiveVideo":true});
    }

    function sendMediaStream(signal) {
        var reader = new FileReader();
        reader.onload = (function(event) {
            window.AudioContext = window.AudioContext||window.webkitAudioContext;
            var audioContext = new AudioContext();
            audioContext.decodeAudioData(event.target.result, function(buffer) {
                var source = audioContext.createBufferSource();
                var destination = audioContext.createMediaStreamDestination();
                source.buffer = buffer;
                source.start(0);
                source.connect(destination);
                that.peerConnection.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function() {
                    that.answerOffer(function() {
                        that.sendNewMediaStreamOffer(destination.stream);
                    });
                }, logErrorToConsole);
            });
        });
        reader.readAsArrayBuffer(that.file);
    }

    function prepareForDataChannel(file) {
        that.peerConnection.peerConnection.ondatachannel = function(event) {
            that.dataChannel = event.channel;
            that.dataChannel.onopen = function() {
                that.dataChannel.send(file.name);
                that.dataChannel.send(file);
            }
        };
    }

    function openDataChannel(roomId) {
        that.dataChannel = that.peerConnection.peerConnection.createDataChannel(roomId, null);
        that.dataChannel.onopen = function () {
            that.dataChannel.onmessage = function (event) {
                var data = event.data;
                if (typeof data === 'string' || data instanceof String)  {
                    that.fileName = data;
                } else {
                    var reader = new window.FileReader();
                    reader.readAsDataURL(data);
                    reader.onload = function (event) {
                        var fileDataURL = event.target.result; // it is Data URL...can be saved to disk
                        saveToDisk(fileDataURL, that.fileName);
                    };
                }
            };
        }
    }

    function prepareForMediaStream() {
        that.peerConnection.peerConnection.onaddstream = function (event) {
            var audioPlayer = document.querySelector("audio");
            audioPlayer.src = window.URL.createObjectURL(event.stream);
            var videoPlayer = document.querySelector("video");
            videoPlayer.src = window.URL.createObjectURL(event.stream);
        }
    }

    function saveToDisk(fileUrl, fileName) {
        var hyperlink = document.createElement('a');
        hyperlink.href = fileUrl;
        hyperlink.target = '_blank';
        hyperlink.download = fileName || fileUrl;

        (document.body || document.documentElement).appendChild(hyperlink);
        hyperlink.onclick = function() {
            (document.body || document.documentElement).removeChild(hyperlink);

        };

        var mouseEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });

        hyperlink.dispatchEvent(mouseEvent);

        if(!navigator.mozGetUserMedia) { // if it is NOT Firefox
            window.URL.revokeObjectURL(hyperlink.href);
        }
    }

    //Code for Chrome implementation.
    //function transformOutgoingSdp(sdp) {
    //    console.log(sdp);
    //    var splitted = sdp.split("b=AS:30");
    //    console.log(splitted[0]);
    //    console.log(splitted[1]);
    //    var newSDP = splitted[0] + "b=AS:1638400" + splitted[1];
    //    return newSDP;
    //}
    //
    //function sendFileInChunks(event, text) {
    //    var data = {};
    //    var chunkLength = 1638400;
    //    if ((event)) {
    //        setTimeout(null, 10000);
    //        text = event.target.result;
    //    }
    //    if (text.length > chunkLength) {
    //        data.message = text.slice(0, chunkLength);
    //    } else {
    //        data.message = text;
    //        data.last = true;
    //    }
    //
    //    that.dataChannel.send(JSON.stringify(data));
    //
    //    var remainingDataURL = text.slice(data.message.length);
    //
    //    if ((remainingDataURL.length)) {
    //        setTimeout(function () {
    //            sendFileInChunks(null, remainingDataURL);
    //        }, 1000);
    //    }
    //}
    //
    //function storeFile(data) {
    //    console.log(data);
    //    that.transferedFile.push(data.message);
    //    if (data.last) {
    //        saveToDisk(that.transferedFile.join(''), data.fileName);
    //    }
    //}
    //
    //function transferFile(file) {
    //    if (window.File && window.FileReader && window.FileList && window.Blob) {
    //        if (file === undefined || file === null) {
    //            logErrorToConsole("file is undefined or null");
    //        } else {
    //            that.dataChannel.send(file);
    //        }
    //    } else {
    //        logErrorToConsole("HTML5 File API is not supported in this browser");
    //    }
    //}
}

