var peerConnection;

function startSession(isUploader, roomId) {
     peerConnection = new RTCPeerConnection(
        { "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] },
        {optional: [{RtpDataChannels: true}] }
    );
    peerConnection.onicecandidate = function(event) {
        signallingChannel.send(JSON.stringify({ "candidate": event.candidate }));
    };
    if(!isUploader) {
        // if the user is a downloader, create and send offer to the file uploader.
        peerConnection.createOffer(function (description) {
            peerConnection.setLocalDescription(description, function() {
                signallingChannel.send(JSON.stringify({
                    'sdp': peerConnection.localDescription
                }));
            });
        }, logErrorToConsole);
    }
}

function answerOffer() {
    if (peerConnection.remoteDescription.type == 'offer' && isUploader) {
        peerConnection.createAnswer(function (description) {
            peerConnection.setLocalDescription(description, function() {
                signallingChannel.send(JSON.stringify({
                    'sdp': peerConnection.localDescription
                }));
            });
        }, logErrorToConsole);
    }
}


