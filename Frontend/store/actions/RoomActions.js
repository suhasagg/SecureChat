import Room from "../../models/Rooms";
import * as API from "../../constants/APIstore";
export const FILL_DATA = "FLL_DATA";
import axios from "axios";
import moment from "moment";
import { UpdatelastMessageReadIndex, promptGroup } from "../reducers/Socket";

export const addMessage = (roomId, message) => {
  return async (dispatch, getState) => {
    try {
      var newState = getState().room;
      const index = newState.rooms.findIndex((room) => room.id === roomId);
      message = { ...message, timestamp: moment.now() };
      var room = newState.rooms[index];
      room.messages.push(message);
      const lastMessage = room.messages.slice(-1)[0];
      room.lastMessage = lastMessage.message_body;
      room.lastTime = lastMessage.timestamp;
    } catch (error) {
      alert(error);
    }
  };
};

export const updatelastMessageReadIndex = (roomId) => {
  return async (dispatch, getState) => {
    try {
      if (roomId) {
        const user = getState().user;
        var newState = getState().room;
        const index = newState.rooms.findIndex((room) => room.id == roomId);
        var room = newState.rooms[index];
        room.lastMessageReadIndex = room.messages.length;
        UpdatelastMessageReadIndex(roomId, user.token);
      }
    } catch (error) {
      alert(error);
    }
  };
};

export const fillData = () => {
  console.log("i am called");
  return async (dispatch, getState) => {
    try {
      var user = getState().user;
      const data = await axios({
        method: "GET",
        url: API.GETROOMS,
        headers: {
          "auth-token": user.token,
          "Content-Type": "application/json",
        },
      }).then((res) => res.data);
      if (data) {
        var rooms = [];
        for (const room of data) {
          if (room) {
            var roomName = null;
            var profile_pic = "";
            var description = "";
            var isGroup = false;
            if (!room.name) {
              for (var member of room.members) {
                if (member.id != user.id) {
                  const user2 = await axios({
                    method: "GET",
                    url: API.USERBASEAPI + `/${member.id}`,
                    headers: {
                      "auth-token": user.token,
                      "Content-Type": "application/json",
                    },
                  }).then((res) => res.data);
                  delete user2.password;
                  member["details"] = user2;
                  roomName = user2.name;
                  profile_pic = user2.profile_pic;
                  description = user2.status;
                  isGroup = false;
                }
              }
            } else {
              roomName = room.name;
              profile_pic = room.profile_pic;
              description = room.description;
              isGroup = true;
              for (var member of room.members) {
                const user2 = await axios({
                  method: "GET",
                  url: API.USERBASEAPI + `/${member.id}`,
                  headers: {
                    "auth-token": user.token,
                    "Content-Type": "application/json",
                  },
                }).then((res) => res.data);
                delete user2.password;
                member["details"] = user2;
              }
            }
            const messages = room.messages;
            var lastMessage = description;
            var lastTime = room.create_date;
            if (messages[0]) {
              lastMessage = messages.slice(-1)[0].message_body;
              lastTime = messages.slice(-1)[0].timestamp;
            }
            const readIndex = room.members.find((mem) => mem.id === user.id);
            const NewRoom = new Room(
              room._id,
              roomName,
              description,
              profile_pic,
              messages,
              room.members,
              readIndex.lastMessageReadIndex,
              isGroup,
              room.creator_id
            );
            NewRoom.updateLastMessage(lastMessage);
            NewRoom.updateLastTime(lastTime);
            rooms.push(NewRoom);
          }
        }
        const roomState = {
          rooms: rooms,
        };
        dispatch({ type: FILL_DATA, payload: roomState });
      }
    } catch (error) {
      alert(error);
    }
  };
};

export const addRoom = (body) => {
  return async (dispatch, getState) => {
    try {
      var user = getState().user;
      var newState = getState().room;
      const room = await axios({
        method: "POST",
        url: API.ADDNEWROOM,
        headers: {
          "auth-token": user.token,
          "Content-Type": "application/json",
        },
        data: body,
      }).then((res) => res.data.room);
      var roomName = null;
      var profile_pic = "";
      var description = "";
      var isGroup = false;
      if (!room.name) {
        for (var member of room.members) {
          if (member.id != user.id) {
            const user2 = await axios({
              method: "GET",
              url: API.USERBASEAPI + `/${member.id}`,
              headers: {
                "auth-token": user.token,
                "Content-Type": "application/json",
              },
            }).then((res) => res.data);
            delete user2.password;
            member["details"] = user2;
            roomName = user2.name;
            profile_pic = user2.profile_pic;
            description = user2.status;
            isGroup = false;
          }
        }
      } else {
        roomName = room.name;
        profile_pic = room.profile_pic;
        description = room.description;
        isGroup = true;
        for (var member of room.members) {
          const user2 = await axios({
            method: "GET",
            url: API.USERBASEAPI + `/${member.id}`,
            headers: {
              "auth-token": user.token,
              "Content-Type": "application/json",
            },
          }).then((res) => res.data);
          delete user2.password;
          member["details"] = user2;
        }
      }
      const messages = room.messages;
      var lastMessage = description;
      var lastTime = room.create_date;
      if (messages[0]) {
        lastMessage = messages.slice(-1)[0].message_body;
        lastTime = messages.slice(-1)[0].timestamp;
      }
      const readIndex = room.members.find((mem) => mem.id === user.id);
      const NewRoom = new Room(
        room._id,
        roomName,
        description,
        profile_pic,
        messages,
        room.members,
        readIndex.lastMessageReadIndex,
        isGroup,
        room.creator_id
      );
      NewRoom.updateLastMessage(lastMessage);
      NewRoom.updateLastTime(lastTime);
      newState.rooms.push(NewRoom);
      await promptGroup(user.token, room._id);
      dispatch({ type: FILL_DATA, payload: newState });
    } catch (e) {
      console.log(e);
    }
  };
};

export const updateNameDescription = (roomId, name, description) => {
  return async (dispatch, getState) => {
    try {
      var user = getState().user;
      const data = await axios({
        method: "PATCH",
        url: API.PATCHROOM + `/${roomId}`,
        headers: {
          "auth-token": user.token,
          "Content-Type": "application/json",
        },
        data: {
          name: name,
          description: description,
        },
      }).then((res) => res.data);
      var newState = getState().room;
      const index = newState.rooms.findIndex((room) => room.id === roomId);
      var room = newState.rooms[index];
      room.name = name;
      room.description = description;
    } catch (e) {
      console.log(e);
    }
  };
};

export const leaveRoom = (roomId) => {
  return async (dispatch, getState) => {
    try {
      var user = getState().user;
      const data = await axios({
        method: "PATCH",
        url: API.LEAVEROOM + `/${roomId}`,
        headers: {
          "auth-token": user.token,
          "Content-Type": "application/json",
        },
      }).then((res) => res.data);
      await promptGroup(user.token, roomId);
    } catch (e) {
      console.log(e);
    }
  };
};

export const RemoveMember = (roomId, member) => {
  return async (dispatch, getState) => {
    try {
      var user = getState().user;
      const data = await axios({
        method: "PATCH",
        url: API.REMOVEMEMBER + `/${roomId}`,
        headers: {
          "auth-token": user.token,
          "Content-Type": "application/json",
        },
        data: {
          member: member,
        },
      }).then((res) => res.data);
      await promptGroup(user.token, roomId);
    } catch (e) {
      console.log(e);
    }
  };
};

export const AddMember = (roomId, member) => {
  return async (dispatch, getState) => {
    try {
      var user = getState().user;
      const data = await axios({
        method: "PATCH",
        url: API.ADDMEMBER + `/${roomId}`,
        headers: {
          "auth-token": user.token,
          "Content-Type": "application/json",
        },
        data: {
          member: member,
        },
      }).then((res) => res.data);
      await promptGroup(user.token, roomId);
    } catch (e) {
      console.log(e);
    }
  };
};
