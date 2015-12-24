function p2p() {
    this.peerConnection = null;
    this.dataChannel;
    this.signallingChannel;
    this.roomId = null;
    this.fileName = null;
    this.file = null;
    this.transferedFile = [];
    var that = this;

    this.startSession = function (roomId, user, file) {
        that.signallingChannel = new signaller();
        if(roomId == null) {
            roomId = that.signallingChannel.createNewRoom();
            that.roomId = roomId;
        }

        that.signallingChannel.connect(roomId, user, that.onSignal, function() {
            that.peerConnection = new RTCPeerConnection(
                {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]},
                null
            );
            that.peerConnection.onicecandidate = function (event) {
                    that.signallingChannel.send(JSON.stringify({"candidate": event.candidate}));
            };

            if(user == userType.DOWNLOADER || user == userType.STREAMER) {
                if (user == userType.DOWNLOADER) {
                    that.dataChannel = that.peerConnection.createDataChannel(roomId, null);
                    that.dataChannel.onopen = function () {
                        if (that.dataChannel.readyState === 'open') {
                            that.dataChannel.onmessage = function (event) {
                                storeFile(JSON.parse(event.data));
                            }
                        }
                    }
                } else if (user == userType.STREAMER) {
                    that.peerConnection.onaddstream = function (event) {
                        window.AudioContext = window.AudioContext||window.webkitAudioContext;
                        var audioPlayer = document.querySelector("audio");
                        audioPlayer.src = window.URL.createObjectURL(event.stream);
                    }
                }

                that.peerConnection.createOffer(function (description) {
                    that.peerConnection.setLocalDescription(description, function () {
                        that.signallingChannel.send(JSON.stringify({
                            'user': user,
                            'sdp': that.peerConnection.localDescription
                        }));
                    }, logErrorToConsole);
                }, logErrorToConsole);
            }

            if(user == userType.UPLOADER) {
                that.file = file;
                that.fileName = file.name;
                that.peerConnection.ondatachannel = function(event) {
                    that.dataChannel = event.channel;
                    that.transferFile(file);
                };
            }
        });
    };

    this.answerOffer = function(callback) {
        if(that.peerConnection.remoteDescription.type == 'offer') {
            that.peerConnection.createAnswer(function (description) {
                that.peerConnection.setLocalDescription(description, function () {
                    that.signallingChannel.send(JSON.stringify({
                        'sdp': that.peerConnection.localDescription
                    }));
                    if(callback !=  null) {
                        callback();
                    }
                }, logErrorToConsole);
            }, logErrorToConsole);
        }
    };

    this.onSignal = function(data) {
        var signal = JSON.parse(data.body);
        if (signal.sdp) {
            if(signal.user == userType.STREAMER) {
                var reader = new FileReader();
                reader.onload = (function(event) {
                    window.AudioContext = window.AudioContext||window.webkitAudioContext;
                    var context = new AudioContext();
                    context.decodeAudioData(event.target.result, function(buffer) {
                        var source = context.createBufferSource();
                        var destination = context.createMediaStreamDestination();
                        source.buffer = buffer;
                        source.start(0);
                        source.connect(destination);
                        that.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function() {
                            that.answerOffer(function() {
                                that.sendNewMediaStreamOffer(destination.stream);
                            });
                        }, logErrorToConsole);

                    });
                });

                reader.readAsArrayBuffer(that.file);
            }
            else {
                that.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), that.answerOffer, logErrorToConsole);
            }
        } else if (signal.candidate) {
            that.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }

    this.sendNewMediaStreamOffer = function(stream) {
        that.peerConnection.addStream(stream);
        that.peerConnection.createOffer(function (description) {
            that.peerConnection.setLocalDescription(description, function () {
                that.signallingChannel.send(JSON.stringify({
                    'sdp': that.peerConnection.localDescription
                }));
            }, logErrorToConsole);
        }, logErrorToConsole);
    }

    this.transferFile = function(file) {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            if (file === undefined || file === null) {
                logErrorToConsole("file is undefined or null");
            } else {
                var reader  = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = sendFileInChunks;
            }
        } else {
            logErrorToConsole("HTML5 File API is not supported in this browser");
        }
    };

    function sendFileInChunks(event, text) {
        var data = {};
        var chunkLength = 16000;

        if ((event)) {
            text = event.target.result;
        }
        if (text.length > chunkLength) {
            data.message = text.slice(0, chunkLength);
        } else {
            data.message = text;
            data.last = true;
            data.fileName = that.fileName;
        }

        that.dataChannel.send(JSON.stringify(data));

        var remainingDataURL = text.slice(data.message.length);

        if ((remainingDataURL.length)) {
            setTimeout(function () {
                sendFileInChunks(null, remainingDataURL); // continue transmitting
            }, 500);
        }
    }

    function storeFile(data) {
        console.log(data);
        that.transferedFile.push(data.message);
        if (data.last) {
            saveToDisk(that.transferedFile.join(''), data.fileName);
        }
    }

    function saveToDisk(fileUrl, fileName) {
        var save = document.createElement('a');
        save.href = fileUrl;
        save.target = '_blank';
        save.download = fileName || fileUrl;

        var event = document.createEvent('Event');
        event.initEvent('click', true, true);

        save.dispatchEvent(event);
        (window.URL || window.webkitURL).revokeObjectURL(save.href);
    }
}




