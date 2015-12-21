package signalling;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;
import java.util.UUID;

@Controller
public class SignallingController {

    long roomCounter;

    @MessageMapping("/signal/{room}")
    @SendTo("/topic/{room}")
    public String sendSignal(@DestinationVariable String room, String signal) throws Exception {
        return signal;
    }

    @RequestMapping("/{room:[\\d]+}")
    public String routeRoomToIndex(@PathVariable("room") int room) {
        return "index.html";
    }

    @RequestMapping("/newRoom")
    public @ResponseBody long createNewRoom() {
        roomCounter++;
        return roomCounter;
    }
 }

