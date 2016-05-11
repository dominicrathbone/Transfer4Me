var signaller = require('./signaller.js');
var app = require('./app.js');
require("webrtc-adapter");
var Smoothie = require("smoothie");
var randomColor = require("randomcolor");
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();

module.exports = function () {

    // ______ ______ ______
    //|   __ \__    |   __ \
    //|    __/    __|    __/
    //|___|  |______|___|


    this.user;
    this.UserType = {
        UPLOADER: 0,
        DOWNLOADER: 1,
        STREAMER: 2
    };
    this.connection;
    this.sessionStarted = false;
    this.incomingConnections = [];
    this.signallingChannel = new signaller();
    this.roomId = null;
    this.fileName = null;
    this.chunkedFile = [];

    this.bytesReceivedByStreamers = new Smoothie.SmoothieChart();
    this.bytesReceivedByDownloaders = new Smoothie.SmoothieChart();
    this.stats = [];
    var p2p = this;

    //Represents the statistics sent by the file recipients
    function Stats(id) {
        this.id = id;
        this.color = randomColor();
        this.streamBytesReceived = new Smoothie.TimeSeries();
        this.downloadBytesReceived = new Smoothie.TimeSeries();

        p2p.bytesReceivedByStreamers.addTimeSeries(this.streamBytesReceived, {
            strokeStyle: this.color,
            lineWidth: 3
        });
        p2p.bytesReceivedByDownloaders.addTimeSeries(this.downloadBytesReceived, {
            strokeStyle: this.color,
            lineWidth: 3
        });
    }

    //Starts session with a room to upload, download or stream a file.
    this.startSession = function (roomId, passworded, user, file, callback) {
        p2p.sessionStarted = true;
        var password;
        //If a room id hasn't been found in the URL, create a new room.
        if (roomId == null) {
            var result = p2p.signallingChannel.addRoom(passworded);
            roomId = result.roomId;
            password = result.password;
        }
        p2p.roomId = roomId;

        //connect to the namespace of the signalling room via WebSockets.
        p2p.signallingChannel.connect(roomId, onSignal, function(id) {
            //If user id hasn't been added, use the id of the socket as the id of the user.
            if (user.userId == null) {
                user.userId = id;
            }

            //on websockets connection
            onSignallerConnect(roomId, user, file);

            //on session started callback
            if (callback != null) {
                callback(roomId, password, p2p.bytesReceivedByStreamers, p2p.bytesReceivedByDownloaders);
            }
        });
    };

    this.endSession = function() {
        if(p2p.sessionStarted) {
            //if a session has been started and the user isn't the uploader, send a signal to the uploader to close the connection
            if (p2p.user.userType !== p2p.UserType.UPLOADER) {
                p2p.signallingChannel.send("signal", JSON.stringify({
                    'user': p2p.user,
                    'toUser': p2p.connection.toUser,
                    "message": "CLOSE_CONNECTION"
                }));
                stopGatheringStats = true;
                p2p.signallingChannel.disconnect();
            } else {
                //if a session has been started and the user is the uploader, just disconnect as the signalling server will close the room automatically.
                p2p.signallingChannel.disconnect();
            }
        }
    }

    function onSignallerConnect(roomId, user, file) {
        //set the user for the session.
        p2p.user = user;

        if (user.userType == p2p.UserType.DOWNLOADER || user.userType == p2p.UserType.STREAMER) {
            //assign a new peer to peer connection for the session
            p2p.connection = new Connection(null);
            //if the user is downloading the file, prepare to receive the file.
            if (user.userType == p2p.UserType.DOWNLOADER) {
                prepareForDownload(roomId);
            } else if (user.userType == p2p.UserType.STREAMER) {
                //if the user is streaming the file, prepare to stream the file.
                prepareForMediaStream();
            }
            //Once prepared, send the offer to the uploader.
            sendOffer();
        } else if (user.userType == p2p.UserType.UPLOADER) {
            // if the user is the uploader of the file, set the file for the session and update file metadata on the server.
            p2p.file = file;
            p2p.signallingChannel.send('metadata', JSON.stringify({
                "fileType" : file.type,
                "fileSize" : file.size
            }));
        }
    }

    //Models a connection to another user.
    //Associates a socket id to a peer connection object.
    //Sets up the retrieval and addition of ice candidates.
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

        //If the signal is from another user
        if (signal.user) {
            //If it is from a streamer or downloader
            if (signal.user.userType == p2p.UserType.STREAMER || signal.user.userType == p2p.UserType.DOWNLOADER) {
                //Get the connection for this user
                var connection = getConnection(signal.user);
                //if the signal is an offer
                if (signal.sdp) {
                    //If the offer is from a streamer, prepare the file to stream and send an answer.
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
                        //If the offer is from a downloader, prepare the file to download and send an answer.
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
                    //if the signal is an ICE candidate from that user, add it to the peer connection
                    connection.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } else if(signal.message && signal.message == "CLOSE_CONNECTION") {
                    removeConnection(signal.user);
                }
            } else if (signal.user.userType == p2p.UserType.UPLOADER) {
                //set the connection user to the socket id of the incoing signal
                p2p.connection.toUser = signal.user;
                //if the signal is an answer, set it as remote description
                if (signal.sdp) {
                    p2p.connection.peerConnection.setRemoteDescription(
                        new RTCSessionDescription(signal.sdp),
                        function () {},
                        app.logErrorToConsole
                    );
                } else if (signal.candidate) {
                    //if the signal is an ICE candidate from that user, add it to the peer connection
                    p2p.connection.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } else if(signal.user == "SERVER" && signal.hasOwnProperty("users")) {
                //if the signal is from the server and contains the amount of users, update the amount of users.
                //this should be refactored to a callback
                $("#users").text(signal.users + " user(s) connected to you.");
            }
        } else if(signal.stats) {
            //Get the stats object for the socket id
            var stats = findStatsObject(signal.userId);
            //if new, add a stats object for user
            if (stats == null) {
                stats = new Stats(signal.userId);
                p2p.stats.push(stats);
            }
            //if stats is from streamer
            if (signal.stats.streamBytesReceived) {
                stats.streamBytesReceived.append(new Date().getTime(), signal.stats.streamBytesReceived);
            }
            //if stats is from downloader
            if (signal.stats.downloadBytesReceived) {
                stats.downloadBytesReceived.append(new Date().getTime(), signal.stats.downloadBytesReceived);
                console.log(stats.downloadBytesReceived);
            }
        }
    }

    var offerSentTime = null;
    function sendOffer() {
        p2p.connection.peerConnection.createOffer(function (description) {
            p2p.connection.peerConnection.setLocalDescription(description, function () {
                //On creation of the offer, manipulate the sdp to allow a higher throughout on the data channel (for Chrome) and send it to user.
                p2p.connection.peerConnection.localDescription.sdp = transformOutgoingSdp(p2p.connection.peerConnection.localDescription.sdp);
                p2p.signallingChannel.send('signal', JSON.stringify({
                    'user': p2p.user,
                    'toUser': p2p.connection.toUser,
                    'sdp': p2p.connection.peerConnection.localDescription
                }));
                //Record sent time for statistics
                offerSentTime = Date.now();
                console.log("OFFER SENT");
            }, app.logErrorToConsole);
        }, app.logErrorToConsole, {"offerToReceiveAudio": true, "offerToReceiveVideo": true});
    }

    function answerOffer(connection) {
        if (connection.peerConnection.remoteDescription.type == 'offer') {
            connection.peerConnection.createAnswer(function (description) {
                connection.peerConnection.setLocalDescription(description, function () {
                    //If user is on Chrome, manipulate the sdp to allow a higher throughout on the data channel and send it to user.
                    if(connection.toUser.isChrome) {
                        connection.peerConnection.localDescription.sdp = transformOutgoingSdp(connection.peerConnection.localDescription.sdp);
                    }
                    p2p.signallingChannel.send('signal', JSON.stringify({
                        'user': p2p.user,
                        'toUser': connection.toUser,
                        'sdp': connection.peerConnection.localDescription
                    }));
                    console.log("ANSWER SENT");
                }, app.logErrorToConsole);
            }, app.logErrorToConsole);
        }
    };

    function prepareFileStream(connection, file, callback) {
        //Create new file reader
        var reader = new FileReader();
        //On finishing the file read
        reader.onloadend = (function (event) {
            //Decode the audio file
            audioContext.decodeAudioData(event.target.result, function (buffer) {
                //Create source and connect it to a MediaStream
                var source = audioContext.createBufferSource();
                var destination = audioContext.createMediaStreamDestination();
                source.buffer = buffer;
                source.start(0);
                source.connect(destination);
                //add the MediaStream to the connection
                connection.peerConnection.addStream(destination.stream);
                if(callback !== null) {
                    callback();
                }
            });
        });
        reader.readAsArrayBuffer(file);
    }

    function sendFileOnDataChannel(connection, file, callback) {
        //On receiving a data channel from the downloader
        connection.peerConnection.ondatachannel = function (event) {
            var dataChannel = event.channel;
            //On data channel changing to "open" state
            dataChannel.onopen = function () {
                console.log("SENDING FILE");
                //send file name ahead of file so the recipient can name it.
                dataChannel.send(JSON.stringify({"fileName":file.name}))
                //if the recipient or this user are using Chrome, chunk the file.
                if(connection.toUser.isChrome || p2p.user.isChrome) {
                    var reader = new window.FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = function(event) {
                        sendFileInChunks(event, null, dataChannel);
                    }
                } else if(connection.toUser.isFirefox && p2p.user.isFirefox) {
                    //else if they are both using firefox, send it in full.
                    dataChannel.send(file);
                }
            }
        };
        if(callback !== null) {
            callback();
        }
    }

    function prepareForMediaStream() {
        //On stream being added, add an audio player element and use it to play it.
        //This should be refactored to use a callback instead of directly manipulating DOM.
        p2p.connection.peerConnection.onaddstream = function (event) {
            console.log("STREAM RECEIVED");
            gatherStreamingStats(p2p.connection,1000);
            var audioPlayer = $("audio");
            audioPlayer.attr("src", window.URL.createObjectURL(event.stream));
            audioPlayer.trigger("play");
        }
    }

    var progressCounter = 0;
    function prepareForDownload(roomId) {
        //Add data channel and wait for uploader to send file.
        var dataChannel = p2p.connection.peerConnection.createDataChannel(roomId,  {reliable:true});
        dataChannel.onopen = function () {
            dataChannel.onmessage = function (event) {
                var data = event.data;
                if (typeof data === 'string' || data instanceof String) {
                    var dataObject = JSON.parse(event.data);
                    if(dataObject.fileName) {
                        p2p.fileName = dataObject.fileName;
                    } else if(dataObject.chunk) {
                        //increment progress bar
                        if(progressCounter < 60){
                            $('progress').val(progressCounter++);
                        }
                        //add the chunk to the current array of chunks
                        appendChunkToFile(dataObject);
                    }
                } else {
                    //User is using firefox and can receive full file and save to disk.
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

    //This should probably be in app.js
    function saveToDisk(fileUrl, fileName) {
        //Set up download element
        var downloadElement = document.createElement('a');
        downloadElement.href = fileUrl;
        downloadElement.download = fileName || fileUrl;
        $('progress').val(60);
        //Append it to the document.

        downloadElement.onclick = function() {
            $('#progress-text').text("File has been downloaded!")
            $('progress').val(100);
            document.body.removeChild(downloadElement);
            gatherDownloadStats(true);
            //End the peer to peer session now they have finished downloading the file.
            p2p.endSession();
        };

        document.body.appendChild(downloadElement);

        //Create new mouse event to click the download element.
        var mouseEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        $('progress').val(80);
        //Click the download element, triggering on click event
        downloadElement.dispatchEvent(mouseEvent);
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

    //Takes in an sdp and returns a modified version to allow for a higher DataChannel bandwidth in older versions of Chrome
    //https://github.com/Peer5/ShareFest/issues/10
    function transformOutgoingSdp(sdp) {
        var splitted = sdp.split("b=AS:30");
        var newSDP = splitted[0] + "b=AS:1638400" + splitted[1];
        return newSDP;
    }

    function sendFileInChunks(event, text, dataChannel) {
        var data = {};
        //Maximum size of the chunk
        var chunkLength = 64000;

        //if it is the first iteration of the recursion,
        //get the output from the fileReader event
        if ((event)) {
            text = event.target.result;
        }

        // if the rest of the file is bigger than the maximum size of the chunk
        if (text.length > chunkLength) {
            //split a chunk from it
            data.chunk = text.slice(0, chunkLength);
        } else {
            //put the last chunk of the file and alert the recipient it is the last they will receive
            data.chunk = text;
            data.last = true;
        }

        //Send chunk to recipient
        dataChannel.send(JSON.stringify(data));
        console.log(data);

        //Take the length of the new chunk away from the file
        var remainingDataURL = text.slice(data.chunk.length);
        //if the remaining file length is bigger than 0
        if (remainingDataURL.length) {
            //call the function recursively.
            setTimeout(function () {
                sendFileInChunks(null, remainingDataURL, dataChannel);
            }, 1000);
        }
    }

    function appendChunkToFile(data) {
        console.log(data);
        //Add chunk to the array of previously received chunks
        p2p.chunkedFile.push(data.chunk);
        gatherDownloadStats();
        //if its the last chunk, stop appending and save the file to disk.
        if (data.last) {
            $('progress').val(60);
            saveToDisk(p2p.chunkedFile.join(''), p2p.fileName);
        }
    }

    function findStatsObject(id) {
        for(var i = 0 ; i < p2p.stats.length; i++) {
            if(p2p.stats[i].id == id) {
                return p2p.stats[i];
            }
        }
        return null;
    }

    var stopGatheringStats = false;
    var streamStatGatheringStartTime = null;
    function gatherStreamingStats(connection, delay) {
        //if streaming hasn't already started
        if(!streamStatGatheringStartTime) {
            //record start time
            streamStatGatheringStartTime = Date.now();
        }

        //Firefox uses media tracks
        var getStatsTarget = connection.peerConnection.getRemoteStreams()[0].getAudioTracks()[0];
        //Chrome can just use the peer connection
        if (p2p.user.isChrome) {
            getStatsTarget = connection.peerConnection;
        }
        connection.peerConnection.getStats(getStatsTarget, function (results) {
            var stats = {};
            Object.keys(results).forEach(function (key) {
                if (p2p.user.isFirefox) {
                    if (key.indexOf("inbound_rtp_audio") !== -1) {
                        //get Audio Channel object from result of getStats data
                        stats.audioChannel = results[key];
                        stats.audioChannel.bytesReceivedPerSecond = stats.audioChannel.bytesReceived / ((Date.now() - streamStatGatheringStartTime) / 1000)
                    }
                } else if(p2p.user.isChrome) {
                    if (key.indexOf("ssrc_") !== -1) {
                        //get Audio Channel object from result of getStats data
                        stats.audioChannel = results[key];
                        stats.audioChannel.bytesReceivedPerSecond = stats.audioChannel.bytesReceived / ((Date.now() - streamStatGatheringStartTime) / 1000)
                    } else if (key.indexOf("Conn-audio") !== -1) {
                        //get Audio Connection object from result of getStats data (specific to Chrome)
                        stats.audioConnection = results[key];
                    }
                }
            });
            console.log(stats);
            //Send to uploader
            p2p.signallingChannel.send("stats", JSON.stringify({
                "userId": p2p.user.userId,
                "userBrowser": p2p.user.isChrome || p2p.user.isFirefox,
                "toUserId": connection.toUser.userId,
                "stats": stats
            }));
        },app.logErrorToConsole);
        if (stopGatheringStats == false) {
            setTimeout(function () {
                gatherStreamingStats(connection, delay);
            }, delay);
        }
    }

    var downloadStatGatheringStartTime = null;
    function gatherDownloadStats(last) {
        var stats = {};
        stats.dataChannel = {};
        if (p2p.user.isChrome) {
            if(!downloadStatGatheringStartTime) {
                downloadStatGatheringStartTime = Date.now();
            }
            stats.dataChannel.bytesReceived = p2p.chunkedFile.join('').length;
            stats.dataChannel.bytesReceivedPerSecond = p2p.chunkedFile.join('').length / ((Date.now() - downloadStatGatheringStartTime) / 1000);
        }
        if(last) {
            stats.dataChannel.timeTaken = Date.now() - offerSentTime;
        }
        console.log(stats);
        p2p.signallingChannel.send("stats", JSON.stringify({
            "userId": p2p.user.userId,
            "toUserId": p2p.connection.toUser.userId,
            "stats": stats
        }));
    }
}
