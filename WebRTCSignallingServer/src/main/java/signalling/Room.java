package signalling;

import java.util.List;

/**
 * Created by drathbone on 21/01/16.
 */
public class Room {

    int ID;
    List<Integer> users;
    int userCounter;


    public Room(int ID, List<Integer> users) {
        this.ID = ID;
        this.users = users;
    }

    public int getID() {
        return ID;
    }

    public List<Integer> getUsers() {
        return users;
    }

    public int addUser() {
        userCounter++;
        users.add(userCounter);
        return userCounter;
    }

    public boolean removeUser(Integer id) {
        return users.remove(id);
    }



}
