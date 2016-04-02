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
    this.incomingConnections = [];
    this.signallingChannel;
    this.roomId = null;
    this.fileName = null;
    var p2p = this;
    var dataChannel;

    this.startSession = function (roomId, user, file, callback) {
        p2p.signallingChannel = new signaller();
        if (roomId == null) {
            roomId = p2p.signallingChannel.addRoom().roomId;
        }
        p2p.roomId = roomId;

        p2p.signallingChannel.connect(roomId, onSignal, function(id) {
            if (user.userId == null) {
                user.userId = id;
            }
            onSignallerConnect(roomId, user, file);
            if (callback != null) {
                callback(roomId);
            }
        });
    };

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
                p2p.signallingChannel.send(JSON.stringify({
                    'user': p2p.user,
                    'toUser': connection.toUser,
                    "candidate": event.candidate
                }));
            }
        };
    }

    function onSignal(data) {
        var signal = JSON.parse(data);
        console.log(signal);
        if (signal.user) {
            if (signal.user.userType == p2p.UserType.STREAMER || signal.user.userType == p2p.UserType.DOWNLOADER) {
                var connection = getConnection(signal.user);
                if (signal.sdp) {
                    if (signal.user.userType == p2p.UserType.STREAMER) {
                        prepareFileStream(connection, p2p.file, function() {
                            connection.peerConnection.setRemoteDescription(
                                new RTCSessionDescription(signal.sdp),
                                function () {
                                    console.log(p2p);
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
                                    console.log(p2p);
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
                        function () {
                            console.log(p2p);
                        },
                        app.logErrorToConsole
                    );
                } else if (signal.candidate) {
                    p2p.connection.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } else if(signal.user == "SERVER") {
                console.log(signal.users);
                $("#users").text(signal.users + " user(s) connected to you.");
            }
        }
    }

    function sendOffer() {
        p2p.connection.peerConnection.createOffer(function (description) {
            p2p.connection.peerConnection.setLocalDescription(description, function () {
                p2p.signallingChannel.send(JSON.stringify({
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
                    p2p.signallingChannel.send(JSON.stringify({
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
            dataChannel = event.channel;
            dataChannel.onopen = function () {
                console.log("SENDING FILE");
                dataChannel.send(file.name);
                dataChannel.send(file);
            }
        };
        if(callback !== null) {
            callback();
        }
    }

    function prepareForMediaStream() {
        p2p.connection.peerConnection.onaddstream = function (event) {
            console.log("STREAM RECEIVED");
            var audioPlayer = $("audio");
            var stream = event.stream;
            audioPlayer.attr("src", window.URL.createObjectURL(event.stream));
            audioPlayer.trigger("play");
        }
    }

    function prepareForDownload(roomId) {
        dataChannel = p2p.connection.peerConnection.createDataChannel(roomId, null);
        dataChannel.onopen = function () {
            console.log("DATA CHANNEL OPEN");
            dataChannel.onmessage = function (event) {
                var data = event.data;
                if (typeof data === 'string' || data instanceof String) {
                    p2p.fileName = data;
                } else {
                    $('progress').val(20);
                    console.log("FILE RECEIVED");
                    var reader = new window.FileReader();
                    reader.readAsDataURL(data);
                    reader.onload = function (event) {
                        $('progress').val(40);
                        var fileDataURL = event.target.result; // it is Data URL...can be saved to disk
                        saveToDisk(fileDataURL, p2p.fileName);
                    };
                }
            };
        }
    }

    function saveToDisk(fileUrl, fileName) {
        //var hyperlink = $('<a target="_blank"/>')
        //hyperlink.attr("href", fileUrl);
        //hyperlink.attr("download", fileName || fileUrl);
        //
        //$('body').append(hyperlink);
        //hyperlink.click(function() {
        //    hyperlink.remove();
        //});
        //hyperlink.trigger(jQuery.Event("click"));
        //
        //
        //if (!navigator.mozGetUserMedia) { // if it is NOT Firefox
        //    window.URL.revokeObjectURL(hyperlink.href);
        //}
        //
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

        // if you're writing cross-browser function:
        if(!navigator.mozGetUserMedia) { // i.e. if it is NOT Firefox
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


