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

    socket.on("join-room", ({ role, division }) => {

      if (role === "productionSupervisor") {

        socket.join(
          `production:${division.toLowerCase()}`
        );

        console.log(
          `${socket.id} joined production:${division}`
        );
      }

    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected :", socket.id,reason);
    });
     socket.on("error", (err) => {
    console.log(err);
  });

  });

};

export const getIO = () => io;