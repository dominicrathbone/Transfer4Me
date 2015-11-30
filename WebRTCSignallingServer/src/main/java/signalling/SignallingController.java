package signalling;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class SignallingController {

    @MessageMapping("/signal/{room}")
    @SendTo("/topic/{room}")
    public SignallingMessage sendSignal(@DestinationVariable String room, SignallingMessage message) throws Exception {
        return new SignallingMessage(message.getMessage());
    }

}

