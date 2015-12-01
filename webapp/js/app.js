
$(document).ready(function() {
    $("#connectButton").click(function(){
        var roomId = $("#roomId").val();
        console.log(roomId);
        connect(roomId);
    });
});