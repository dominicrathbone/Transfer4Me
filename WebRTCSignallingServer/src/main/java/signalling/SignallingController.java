package signalling;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Random;

@Controller
public class SignallingController {

    HashMap<Integer, Room> rooms = new HashMap<>();
    Random rng = new Random();

    @MessageMapping("/signal/{room}")
    @SendTo("/topic/{room}")
    public String sendSignal(@DestinationVariable String room, String signal) throws Exception {
        return signal;
    }

    @RequestMapping("/{room:[\\d]+}")
    public String routeRoomToIndex(@PathVariable("room") int roomId) {
        if(rooms.containsKey(roomId)) {
            return "index.html";
        }
        else {
            return null;
        }

    }

    @RequestMapping("/addRoom")
    public @ResponseBody long createNewRoom() {
        int roomId = rng.nextInt(100000);
        while(rooms.containsKey(roomId)) {
            roomId = rng.nextInt(100000);
        }
        rooms.put(roomId, new Room(roomId, new ArrayList<>()));
        return roomId;
    }

    @RequestMapping("/{room:[\\d]+}/addUser")
    public @ResponseBody int addUser(@PathVariable("room") int roomId) {
        return rooms.get(roomId).addUser();
    }

    @RequestMapping("/{room:[\\d]+}/removeUser")
    public @ResponseBody boolean removeUser(@PathVariable("room") int roomId, int userId) {
        return rooms.get(roomId).removeUser(userId);
    }

 }

