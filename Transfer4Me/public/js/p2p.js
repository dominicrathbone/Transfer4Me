var signaller = require('./signaller.js');
var app = require('./app.js');
require("webrtc-adapter");

module.exports = function () {
    this.UserType = {
        UPLOADER: 0,
        DOWNLOADER: 1,
        STREAMER: 2
    };
    this.user;
    this.connection;
    this.sessionStarted = false;
    this.incomingConnections = [];
    this.signallingChannel = new signaller();
    this.roomId = null;
    this.fileName = null;
    this.chunkedFile = [];
    var p2p = this;

    this.startSession = function (roomId, passworded, user, file, callback) {
        p2p.sessionStarted = true;
        var password;
        if (roomId == null) {
            var result = p2p.signallingChannel.addRoom(passworded);
            roomId = result.roomId;
            password = result.password;
        }
        p2p.roomId = roomId;

        p2p.signallingChannel.connect(roomId, onSignal, function(id) {
            if (user.userId == null) {
                user.userId = id;
            }
            onSignallerConnect(roomId, user, file);

            if (callback != null) {
                callback(roomId, password);
            }
        });
    };

    this.endSession = function() {
        if(p2p.sessionStarted) {
            if (p2p.user.userType !== p2p.UserType.UPLOADER) {
                p2p.signallingChannel.send("signal", JSON.stringify({
                    'user': p2p.user,
                    'toUser': p2p.connection.toUser,
                    "message": "CLOSE_CONNECTION"
                }));
                p2p.signallingChannel.disconnect();
            } else {
                p2p.signallingChannel.disconnect();
            }
        }
    }

    function onSignallerConnect(roomId, user, file) {
        p2p.user = user;
        if (user.userType == p2p.UserType.DOWNLOADER || user.userType == p2p.UserType.STREAMER) {
            p2p.connection = new Connection(null);
            if (user.userType == p2p.UserType.DOWNLOADER) {
                prepareForDownload(roomId);
            } else if (user.userType == p2p.UserType.STREAMER) {
                prepareForMediaStream();
            }
            sendOffer();
        } else if (user.userType == p2p.UserType.UPLOADER) {
            p2p.file = file;
            p2p.signallingChannel.send('fileType', JSON.stringify({"fileType" : file.type}));
        }
    }

    function Connection(toUser) {
        var connection = this;
        this.toUser = toUser;
        this.peerConnection = new RTCPeerConnection(
            {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]},
            null
        );
        this.peerConnection.onicecandidate = function(event) {
            if (event.candidate) {
                p2p.signallingChannel.send('signal', JSON.stringify({
                    'room': p2p.roomId,
                    'user': p2p.user,
                    'toUser': connection.toUser,
                    "candidate": event.candidate
                }));
            }
        };
    }

    function onSignal(data) {
        var signal = JSON.parse(data);
        if (signal.user) {
            if (signal.user.userType == p2p.UserType.STREAMER || signal.user.userType == p2p.UserType.DOWNLOADER) {
                var connection = getConnection(signal.user);
                if (signal.sdp) {
                    if (signal.user.userType == p2p.UserType.STREAMER) {
                        prepareFileStream(connection, p2p.file, function() {
                            connection.peerConnection.setRemoteDescription(
                                new RTCSessionDescription(signal.sdp),
                                function () {
                                    answerOffer(connection);
                                },
                                app.logErrorToConsole
                            );
                        });
                    } else if (signal.user.userType == p2p.UserType.DOWNLOADER) {
                        sendFileOnDataChannel(connection, p2p.file, function() {
                            connection.peerConnection.setRemoteDescription(
                                new RTCSessionDescription(signal.sdp),
                                function () {
                                    answerOffer(connection);
                                },
                                app.logErrorToConsole
                            );
                        });
                    }
                } else if (signal.candidate) {
                    connection.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } else if(signal.message && signal.message == "CLOSE_CONNECTION") {
                    removeConnection(signal.user);
                }
            } else if (signal.user.userType == p2p.UserType.UPLOADER) {
                p2p.connection.toUser = signal.user;
                if (signal.sdp) {
                    p2p.connection.peerConnection.setRemoteDescription(
                        new RTCSessionDescription(signal.sdp),
                        function () {},
                        app.logErrorToConsole
                    );
                } else if (signal.candidate) {
                    p2p.connection.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } else if(signal.user == "SERVER") {
                $("#users").text(signal.users + " user(s) connected to you.");
            }
        }
    }

    function sendOffer() {
        p2p.connection.peerConnection.createOffer(function (description) {
            p2p.connection.peerConnection.setLocalDescription(description, function () {
                p2p.connection.peerConnection.localDescription.sdp = transformOutgoingSdp(p2p.connection.peerConnection.localDescription.sdp);
                p2p.signallingChannel.send('signal', JSON.stringify({
                    'user': p2p.user,
                    'toUser': p2p.connection.toUser,
                    'sdp': p2p.connection.peerConnection.localDescription
                }));
            }, app.logErrorToConsole);
        }, app.logErrorToConsole, {"offerToReceiveAudio": true, "offerToReceiveVideo": true});
        console.log("OFFER SENT");
    }

    function answerOffer(connection) {
        if (connection.peerConnection.remoteDescription.type == 'offer') {
            connection.peerConnection.createAnswer(function (description) {
                connection.peerConnection.setLocalDescription(description, function () {
                    if(connection.toUser.isChrome) {
                        connection.peerConnection.localDescription.sdp = transformOutgoingSdp(connection.peerConnection.localDescription.sdp);
                    }
                    p2p.signallingChannel.send('signal', JSON.stringify({
                        'user': p2p.user,
                        'toUser': connection.toUser,
                        'sdp': connection.peerConnection.localDescription
                    }));
                }, app.logErrorToConsole);
            }, app.logErrorToConsole);
            console.log("ANSWER SENT");
        }
    };

    function prepareFileStream(connection, file, callback) {
        var reader = new FileReader();
        reader.onloadend = (function (event) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            var audioContext = new AudioContext();
            audioContext.decodeAudioData(event.target.result, function (buffer) {
                var source = audioContext.createBufferSource();
                var destination = audioContext.createMediaStreamDestination();
                source.buffer = buffer;
                source.start(0);
                source.connect(destination);
                connection.peerConnection.addStream(destination.stream);
                if(callback !== null) {
                    callback();
                }
            });
        });
        reader.readAsArrayBuffer(file);
    }

    function sendFileOnDataChannel(connection, file, callback) {
        connection.peerConnection.ondatachannel = function (event) {
            var dataChannel = event.channel;
            dataChannel.onopen = function () {
                console.log("SENDING FILE");
                dataChannel.send(JSON.stringify({"fileName":file.name}));
                if(connection.toUser.isChrome || p2p.user.isChrome) {
                    var reader = new window.FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = function(event) {
                        sendFileInChunks(event, null, dataChannel);
                    }
                } else if(connection.toUser.isFirefox && p2p.user.isFirefox) {
                    dataChannel.send(file);
                }
            }
        };
        if(callback !== null) {
            callback();
        }
    }

    function prepareForMediaStream() {
        var connection = p2p.connection.peerConnection;
        connection.onaddstream = function (event) {
            console.log("STREAM RECEIVED");
            var audioPlayer = $("audio");
            audioPlayer.attr("src", window.URL.createObjectURL(event.stream));
            audioPlayer.trigger("play");
            gatherStats(connection,1000);
        }
    }

    var progressCounter = 0;
    function prepareForDownload(roomId) {
        var dataChannel = p2p.connection.peerConnection.createDataChannel(roomId,  {reliable:true});
        dataChannel.onopen = function () {
            dataChannel.onmessage = function (event) {
                var data = event.data;
                if (typeof data === 'string' || data instanceof String) {
                    var dataObject = JSON.parse(event.data);
                    if(dataObject.fileName) {
                        p2p.fileName = dataObject.fileName;
                    } else if(dataObject.chunk) {
                        if(progressCounter < 60){
                            $('progress').val(progressCounter++);
                        }
                        appendChunkToFile(dataObject);
                    }
                } else {
                    $('progress').val(20);
                    var reader = new window.FileReader();
                    reader.readAsDataURL(data);
                    reader.onload = function (event) {
                        $('progress').val(40);
                        var fileDataURL = event.target.result;
                        saveToDisk(fileDataURL, p2p.fileName);
                    };
                }
            };
        }
    }

    function saveToDisk(fileUrl, fileName) {
        var hyperlink = document.createElement('a');
        hyperlink.href = fileUrl;
        hyperlink.download = fileName || fileUrl;
        $('progress').val(60);
        (document.body || document.documentElement).appendChild(hyperlink);
        hyperlink.onclick = function() {
            $('#progress-text').text("File has been downloaded!")
            $('progress').val(100);
            (document.body || document.documentElement).removeChild(hyperlink);
        };

        var mouseEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        $('progress').val(80);
        hyperlink.dispatchEvent(mouseEvent);

        if(!navigator.mozGetUserMedia) {
            window.URL.revokeObjectURL(hyperlink.href);
        }
    }

    function getConnection(user) {
        for (var i = 0; i < p2p.incomingConnections.length; i++) {
            if (p2p.incomingConnections[i].toUser.userId === user.userId) {
                return p2p.incomingConnections[i];
            }
        }
        var connection = new Connection(user);
        p2p.incomingConnections.push(connection);
        return connection;
    }

    function removeConnection(user) {
        for(var i = 0; i < p2p.incomingConnections.length; i++) {
            if(p2p.incomingConnections[i].toUser.userId == user.userId) {
                p2p.incomingConnections[i].peerConnection.close();
                p2p.incomingConnections.splice(i,1);
            }
        }
    }

    function transformOutgoingSdp(sdp) {
        var splitted = sdp.split("b=AS:30");
        var newSDP = splitted[0] + "b=AS:1638400" + splitted[1];
        return newSDP;
    }

    function sendFileInChunks(event, text, dataChannel) {
        var data = {};
        var chunkLength = 64000;
        if ((event)) {
            setTimeout(null, 10000);
            text = event.target.result;
        }
        if (text.length > chunkLength) {
            data.chunk = text.slice(0, chunkLength);
        } else {
            data.chunk = text;
            data.last = true;
        }

        dataChannel.send(JSON.stringify(data));
        console.log(data);

        var remainingDataURL = text.slice(data.chunk.length);
        if (remainingDataURL.length) {
            setTimeout(function () {
                sendFileInChunks(null, remainingDataURL, dataChannel);
            }, 1000);
        }
    }

    function appendChunkToFile(data) {
        console.log(data);
        p2p.chunkedFile.push(data.chunk);
        if (data.last) {
            $('progress').val(60);
            saveToDisk(p2p.chunkedFile.join(''), p2p.fileName);
        }
    }

    function gatherStats(connection,delay) {
        if(p2p.user.isChrome) {
            connection.getStats(connection, function(results) {
                console.log(results);
                p2p.signallingChannel.send("stats", JSON.stringify({
                    roomId:p2p.roomId,
                    user:p2p.user,
                    toUser:connection.toUser,
                    results: results
                }))
            });
        }
    }
}






