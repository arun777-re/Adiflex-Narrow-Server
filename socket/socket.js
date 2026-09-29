import { Server } from "socket.io";

let io;

export const initSocket = (server) => {

  io = new Server(server, {
    cors: {
    origin:[
  "http://localhost:5173",
  "https://adiflex-narrow.vercel.app"
],
      credentials: true,    },
  });

  io.on("connection", (socket) => {

    console.log("Client Connected :", socket.id);

    socket.on("join-room", ({ userID }) => {
      if(!userID) return;
      const room = `user:${userID}`;
      socket.join(room);
      console.log(  `👤 ${userID} joined ${room}`);
  });

  });

};

export const getIO = () => io;