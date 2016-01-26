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

    @RequestMapping("/{roomId:[\\d]+}")
    public String routeRoomToIndex(@PathVariable("roomId") int roomId) {
        if(rooms.containsKey(roomId)) {
            return "index.html";
        }
        else {
            return null;
        }
    }

    @RequestMapping("/addRoom")
    public @ResponseBody long addRoom() {
        int roomId = rng.nextInt(100000);
        while(rooms.containsKey(roomId)) {
            roomId = rng.nextInt(100000);
        }
        rooms.put(roomId, new Room(roomId, new ArrayList<>()));
        return roomId;
    }

    @RequestMapping("/removeRoom/{roomId:[\\d]+}")
    public @ResponseBody boolean removeRoom(@PathVariable("roomId") int roomId) {
        rooms.remove(roomId);
        if(rooms.containsKey(roomId)) {
            return false;
        }
        return true;
    }

    @RequestMapping("/{roomId:[\\d]+}/addUser")
    public @ResponseBody int addUser(@PathVariable("roomId") int roomId) {
        return rooms.get(roomId).addUser();
    }

    @RequestMapping("/{roomId:[\\d]+}/removeUser/{userId}")
    public @ResponseBody boolean removeUser(@PathVariable("roomId") int roomId, @PathVariable("userId") int userId) {
        return rooms.get(roomId).removeUser(userId);
    }

}

