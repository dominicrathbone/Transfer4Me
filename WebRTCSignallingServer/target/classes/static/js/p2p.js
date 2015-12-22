function p2p() {
    this.peerConnection = null;
    this.dataChannel;
    this.signallingChannel;
    this.roomId = null;

    var that = this;

    this.startSession = function (roomId, isUploader, file) {
        that.signallingChannel = new signaller();
        if(roomId == null) {
            roomId = that.signallingChannel.createNewRoom();
            that.roomId = roomId;
        }
        that.signallingChannel.connect(roomId, isUploader, that.onSignal, function() {
            that.peerConnection = new RTCPeerConnection(
                {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]},
                null
            );
            that.peerConnection.onicecandidate = function (event) {
                if(event.candidate != null) {
                    that.signallingChannel.send(JSON.stringify({"candidate": event.candidate}));
                }
            };
            if(!isUploader) {
                that.dataChannel = that.peerConnection.createDataChannel(roomId, null);
                that.dataChannel.onopen = function() {
                    if (that.dataChannel.readyState === 'open') {
                        that.dataChannel.onmessage = function(blob) {
                            console.log(blob);
                        }
                    }
                }
                // if the user is a downloader, create and send offer to the file uploader.
                that.peerConnection.createOffer(function (description) {
                    that.peerConnection.setLocalDescription(description, function () {
                        that.signallingChannel.send(JSON.stringify({
                            'sdp': that.peerConnection.localDescription
                            }));
                    }, logErrorToConsole);
                }, logErrorToConsole);
            }
            if(isUploader) {
                that.peerConnection.ondatachannel = function(event) {
                    that.dataChannel = event.channel;
                    that.sendFile(file);
                };
            }
        });
    };

    this.answerOffer = function() {
        if(that.peerConnection.remoteDescription.type == 'offer' && isUploader) {
            that.peerConnection.createAnswer(function (description) {
                that.peerConnection.setLocalDescription(description, function () {
                    that.signallingChannel.send(JSON.stringify({
                        'sdp': that.peerConnection.localDescription
                    }));
                }, logErrorToConsole);
            }, logErrorToConsole);
        }
    };

    this.sendFile = function(file) {
        if(file != null) {
            console.log(file);
            file.forEach(function(blob) {
                    var data = {};
                    data.blob = blob
                    that.dataChannel.send(data);
            });
        }
    };

    this.onSignal = function(data) {
        var signal = JSON.parse(data.body);
        if (signal.sdp) {
            that.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), that.answerOffer, logErrorToConsole);
        } else if (signal.candidate) {
            that.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }
}




