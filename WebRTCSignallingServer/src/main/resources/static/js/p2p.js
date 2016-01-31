function P2p() {
    this.connection;
    this.incomingConnections = [];
    this.signallingChannel;
    this.roomId = null;
    this.fileName = null;
    this.fileStream = null;
    var that = this;

    this.startSession = function(roomId, user, file) {
        that.signallingChannel = new Signaller();
        if(roomId == null) {
            roomId = that.signallingChannel.addRoom();
        }
        that.roomId = roomId;

        if(user.userId == null) {
            user.userId = that.signallingChannel.addUser(roomId);
        }

        that.signallingChannel.connect(roomId, user, onSignal, function() {
            onSignallerConnect(roomId,user,file);
        });
    };

    function onSignallerConnect(roomId, user, file) {
        that.connection = new Connection(user);
        if(user.userType == UserType.DOWNLOADER || user.userType == UserType.STREAMER) {
            if (user.userType == UserType.DOWNLOADER) {
                prepareForDownload(roomId);
            } else if (user.userType == UserType.STREAMER) {
                prepareForMediaStream();
            }
            sendOffer();
        } else if(user.userType == UserType.UPLOADER) {
            that.file = file;
            var audioPlayer = document.querySelector("audio");
            if(!!audioPlayer.canPlayType(file.type)) {
                prepareFileStream(file);
            }
        }
    }

    function Connection(user) {
        this.user = user;
        this.peerConnection = new RTCPeerConnection(
            {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]},
            null
        );
        var that2 = this;
        this.peerConnection.onicecandidate = function(event) {
            that.signallingChannel.send(JSON.stringify({
                'user': that2.user,
                "candidate": event.candidate
            }));
        };
    }

    function onSignal(data) {
        var signal = JSON.parse(data.body);
        console.log(signal);
        if(signal.user) {
            if(that.connection.user.userType == UserType.UPLOADER) {
                if (signal.sdp) {
                    var connection = getConnection(signal.user);
                    if (signal.user.userType == UserType.STREAMER) {
                        connection.peerConnection.addStream(that.fileStream);
                    } else if (signal.user.userType == UserType.DOWNLOADER) {
                        sendFileOnDataChannel(connection, that.file);
                    }
                    connection.peerConnection.setRemoteDescription(
                        new RTCSessionDescription(signal.sdp),
                        function() {
                            //console.log(connection);
                            answerOffer(connection);
                        },
                        logErrorToConsole
                    );
                }
            } else {
                if (signal.sdp) {
                    that.connection.peerConnection.setRemoteDescription(
                        new RTCSessionDescription(signal.sdp),
                        function() {
                            //console.log(connection);
                        },
                        logErrorToConsole
                    );
                } else if(signal.candidate) {
                    that.connection.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            }
        }
    }

    function sendOffer() {
        var connection = that.connection;
        connection.peerConnection.createOffer(function (description) {
            connection.peerConnection.setLocalDescription(description, function () {
                that.signallingChannel.send(JSON.stringify({
                    'user': connection.user,
                    'sdp': connection.peerConnection.localDescription
                }));
            }, logErrorToConsole);
        }, logErrorToConsole, {"offerToReceiveAudio":true,"offerToReceiveVideo":true});
    }

    function answerOffer(connection) {
        if(connection.peerConnection.remoteDescription.type == 'offer') {
            connection.peerConnection.createAnswer(function (description) {
                connection.peerConnection.setLocalDescription(description, function () {
                    that.signallingChannel.send(JSON.stringify({
                        'user': connection.user,
                        'sdp': connection.peerConnection.localDescription
                    }));
                }, logErrorToConsole);
            }, logErrorToConsole);
        }
    };

    function prepareForMediaStream() {
        that.connection.peerConnection.onaddstream = function (event) {
            var audioPlayer = document.querySelector("audio");
            audioPlayer.src = window.URL.createObjectURL(event.stream);
            audioPlayer.play();
        }
    }

    function prepareFileStream(file) {
        var reader = new FileReader();
        reader.onloadend = (function(event) {
            window.AudioContext = window.AudioContext||window.webkitAudioContext;
            var audioContext = new AudioContext();
            audioContext.decodeAudioData(event.target.result, function(buffer) {
                var source = audioContext.createBufferSource();
                var destination = audioContext.createMediaStreamDestination();
                source.buffer = buffer;
                source.start(0);
                source.connect(destination);
                that.fileStream = destination.stream;
            });
        });
        reader.readAsArrayBuffer(file);
    }

    function sendFileOnDataChannel(connection, file) {
        connection.peerConnection.ondatachannel = function(event) {
            var dataChannel = event.channel;
            dataChannel.onopen = function() {
                dataChannel.send(file.name);
                dataChannel.send(file);
            }
        };
    }

    function prepareForDownload(roomId) {
        var dataChannel = that.connection.peerConnection.createDataChannel(roomId, null);
        dataChannel.onopen = function () {
            dataChannel.onmessage = function (event) {
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

    function getConnection(user){
        for (var i=0; i < that.incomingConnections.length; i++) {
            if (that.incomingConnections[i].user.userId === user.userId) {
                return that.incomingConnections[i];
            }
        }
        var connection = new Connection(user);
        that.incomingConnections.push(connection);
        return connection;
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

