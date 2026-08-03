import { getIO } from "../socket/socket.js";
import { appendNotification } from "../services/notificationSheet.js";

export const sendNotification = async ({
  role,
  division,
  type,
  title,
  message,
  reference,
}) => {
  const notification = {
    role,
    division,
    type,
    title,
    message,
    reference,
    read: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  };

  // Save in Google Sheet
  await appendNotification(notification);

  // Send realtime
  const io = getIO();
  let room;

  if (role === "productionSupervisor") {
    room = `${role}:${division.toLowerCase()}`;
  } else {
    room = role;
  }
  console.log("EMIT ROOM:", room);

  if (io) {
    io.to(room).emit("new-notification", notification);
  }
  console.log("Sending notification to room:", room);
  console.log("Notification emitted");
};
