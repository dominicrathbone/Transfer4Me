package signalling;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class SignallingController {

    long roomCounter;

    @MessageMapping("/signal/{room}")
    @SendTo("/topic/{room}")
    public SignallingMessage sendSignal(@DestinationVariable String room, SignallingMessage message) throws Exception {
        return new SignallingMessage(message.getMessage());
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

