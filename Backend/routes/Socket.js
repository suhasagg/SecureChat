const express = require("express");
const User = require("../models/users");
const Room = require("../models/rooms");
const JWT = require("jsonwebtoken");

var ConnectedUsers = {};

module.exports = (io) => {
  io.on("connection", (socket) => {
    socket.on("connectedUser", async (token) => {
      try {
        const verifiedId = JWT.verify(token, process.env.TOKEN_SECRET);
        const user = await User.findById(verifiedId._id);
        if (!verifiedId || !user) {
          socket.emit("error", "Access Denied");
        } else {
          ConnectedUsers[user._id] = socket.id;

          console.log("hi", ConnectedUsers);
          user.rooms_id.forEach(async (roomId) => {
            const room = await Room.findById(roomId);
            if (room.members.length === 2) {
              room.members.forEach((mem) => {
                if (ConnectedUsers[mem.id]) {
                  socket.to(ConnectedUsers[mem.id]).emit("online", key);
                }
              });
            }
          });
        }
      } catch (e) {
        console.log(e);
        socket.emit("error", e);
      }
    });
    socket.on("checkOnline", async (token, userId) => {
      try {
        const verifiedId = JWT.verify(token, process.env.TOKEN_SECRET);
        if (!verifiedId) {
          socket.emit("error", "Access Denied");
        } else {
          if (ConnectedUsers[userId]) socket.emit("online", userId);
        }
      } catch (e) {
        console.log(e);
        socket.emit("error", e);
      }
    });
    socket.on("UpdatelastMessageReadIndex", async (roomId, token) => {
      try {
        const verifiedId = JWT.verify(token, process.env.TOKEN_SECRET);
        if (!verifiedId) {
          socket.emit("error", "Access Denied");
        } else {
          const room = await Room.findById(roomId);
          const MessageNum = room.messages.length;
          const UpdatedRoom = await Room.updateOne(
            { _id: roomId, "members.id": verifiedId._id },
            {
              $set: {
                "members.$.lastMessageReadIndex": MessageNum,
              },
            }
          );
        }
      } catch (e) {
        console.log(e);
        socket.emit("error", e);
      }
    });
    socket.on("message", async (roomId, token, messageBody) => {
      try {
        const verifiedId = JWT.verify(token, process.env.TOKEN_SECRET);
        if (!verifiedId) {
          socket.emit("error", "Access Denied");
        } else {
          const message = {
            sender_id: verifiedId._id,
            message_body: messageBody,
          };
          const room = await Room.findById(roomId);
          const UpdatedRoom = await Room.updateOne(
            { _id: roomId },
            {
              $push: {
                messages: message,
              },
            }
          );
          socket.emit("confirmSend", message, roomId);
          room.members.forEach((mem) => {
            if (ConnectedUsers[mem.id]) {
              socket
                .to(ConnectedUsers[mem.id])
                .emit("recieveMessage", message, roomId);
            }
          });
        }
      } catch (e) {
        console.log(e);
        socket.emit("error", e);
      }
    });
    socket.on("disconnect", async () => {
      try {
        console.log("bye", ConnectedUsers);
        for (const key in ConnectedUsers) {
          if (ConnectedUsers[key] === socket.id) {
            const user = await User.findById(key);
            user.rooms_id.forEach(async (roomId) => {
              const room = await Room.findById(roomId);
              if (room.members.length === 2) {
                room.members.forEach((mem) => {
                  if (ConnectedUsers[mem.id]) {
                    socket.to(ConnectedUsers[mem.id]).emit("offline", key);
                  }
                });
              }
            });
            delete ConnectedUsers[key];
          }
        }
        console.log("bye", ConnectedUsers);
      } catch (e) {
        console.log(e);
      }
    });
  });
};
