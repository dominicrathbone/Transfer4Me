var signaller = require('./signaller.js');
var app = require('./app.js');

module.exports = function() {
    this.connection;
    this.incomingConnections = [];
    this.signallingChannel;
    this.roomId = null;
    this.fileName = null;
    this.fileStream = null;
    var p2p = this;

    this.startSession = function(roomId, user, file) {
            p2p.signallingChannel = new signaller();
            if(roomId == null) {
                roomId = p2p.signallingChannel.addRoom().roomId;
            }
            p2p.roomId = roomId;

            p2p.signallingChannel.connect(roomId, onSignal, function(socket) {
                if(user.userId == null) {
                    console.log(user);
                    console.log(socket.io.engine.id);
                    user.userId = socket.io.engine.id;
                    console.log(user);
                }
                onSignallerConnect(roomId,user,file);
            });
    };

    function onSignallerConnect(roomId, user, file) {
        p2p.connection = new Connection(user);
        if(user.userType == app.UserType.DOWNLOADER || user.userType == app.UserType.STREAMER) {
            if (user.userType == app.UserType.DOWNLOADER) {
                prepareForDownload(roomId);
            } else if (user.userType == app.UserType.STREAMER) {
                prepareForMediaStream();
            }
            sendOffer();
        } else if(user.userType == app.UserType.UPLOADER) {
            p2p.file = file;
            var audioPlayer = document.querySelector("audio");
            if(!!audioPlayer.canPlayType(file.type)) {
                prepareFileStream(file);
            }
        }
    }

    function Connection(user) {
        this.user = user;
        var connection = this;
        this.peerConnection = new RTCPeerConnection(
            {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]},
            null
        );
        this.peerConnection.onicecandidate = function(event) {
            p2p.signallingChannel.send(1, JSON.stringify({
                'user': connection.user,
                "candidate": event.candidate
            }));
        };
    }

    function onSignal(data) {
        var signal = JSON.parse(data.body);
        console.log(signal);
        if(signal.user) {
            if(p2p.connection.user.userType == UserType.UPLOADER) {
                if (signal.sdp) {
                    var connection = getConnection(signal.user);
                    if (signal.user.userType == UserType.STREAMER) {
                        connection.peerConnection.addStream(p2p.fileStream);
                    } else if (signal.user.userType == UserType.DOWNLOADER) {
                        sendFileOnDataChannel(connection, p2p.file);
                    }
                    connection.peerConnection.setRemoteDescription(
                        new RTCSessionDescription(signal.sdp),
                        function() {
                            //console.log(connection);
                            answerOffer(connection);
                        },
                        app.logErrorToConsole
                    );
                } else if(signal.candidate) {
                    p2p.connection.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } else {
                if(signal.user.userType == UserType.UPLOADER) {
                    if (signal.sdp) {
                        p2p.connection.peerConnection.setRemoteDescription(
                            new RTCSessionDescription(signal.sdp),
                            function () {
                                //console.log(connection);
                            },
                            app.logErrorToConsole
                        );
                    } else if (signal.candidate) {
                        p2p.connection.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                    }
                }
            }
        }
    }

    function sendOffer() {
        var connection = p2p.connection;
        connection.peerConnection.createOffer(function (description) {
            connection.peerConnection.setLocalDescription(description, function () {
                p2p.signallingChannel.send(1, JSON.stringify({
                    'user': connection.user,
                    'sdp': connection.peerConnection.localDescription
                }));
            }, app.logErrorToConsole);
        }, app.logErrorToConsole, {"offerToReceiveAudio":true,"offerToReceiveVideo":true});
    }

    function answerOffer(connection) {
        if(connection.peerConnection.remoteDescription.type == 'offer') {
            connection.peerConnection.createAnswer(function (description) {
                connection.peerConnection.setLocalDescription(description, function () {
                    p2p.signallingChannel.send(connection.user.userId, JSON.stringify({
                        'user': p2p.connection.user,
                        'sdp': connection.peerConnection.localDescription
                    }));
                }, app.logErrorToConsole);
            }, app.logErrorToConsole);
        }
    };

    function prepareForMediaStream() {
        p2p.connection.peerConnection.onaddstream = function (event) {
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
                p2p.fileStream = destination.stream;
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
        var dataChannel = p2p.connection.peerConnection.createDataChannel(roomId, null);
        dataChannel.onopen = function () {
            dataChannel.onmessage = function (event) {
                var data = event.data;
                if (typeof data === 'string' || data instanceof String)  {
                    p2p.fileName = data;
                } else {
                    var reader = new window.FileReader();
                    reader.readAsDataURL(data);
                    reader.onload = function (event) {
                        var fileDataURL = event.target.result; // it is Data URL...can be saved to disk
                        saveToDisk(fileDataURL, p2p.fileName);
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
        for (var i=0; i < p2p.incomingConnections.length; i++) {
            if (p2p.incomingConnections[i].user.userId === user.userId) {
                return p2p.incomingConnections[i];
            }
        }
        var connection = new Connection(user);
        p2p.incomingConnections.push(connection);
        return connection;
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
    //    p2p.dataChannel.send(JSON.stringify(data));
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
    //    p2p.transferedFile.push(data.message);
    //    if (data.last) {
    //        saveToDisk(p2p.transferedFile.join(''), data.fileName);
    //    }
    //}
    //
    //function transferFile(file) {
    //    if (window.File && window.FileReader && window.FileList && window.Blob) {
    //        if (file === undefined || file === null) {
    //            app.logErrorToConsole("file is undefined or null");
    //        } else {
    //            p2p.dataChannel.send(file);
    //        }
    //    } else {
    //        app.logErrorToConsole("HTML5 File API is not supported in this browser");
    //    }
    //}


