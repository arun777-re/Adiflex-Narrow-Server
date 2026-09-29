import { getIO } from "../socket/socket.js";
import { appendNotification } from "../services/notificationSheet.js";
import { sendWebPushNotification } from "../services/pushNotificationService.js";

export const sendNotification = async ({
  userID,
  role,
  division,
  type,
  title,
  message,
  reference = "",
}) => {
  try {
    // ==========================================
    // CREATE NOTIFICATION
    // ==========================================

    const notification = {
      userID,
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

    // ==========================================
    // SAVE IN GOOGLE SHEET
    // ==========================================

    await appendNotification(notification);

    // ==========================================
    // SEND REALTIME SOCKET NOTIFICATION
    // ==========================================

    const io = getIO();

    if (io && userID) {
      const room = `user:${userID}`;

      console.log("📡 EMIT ROOM:", room);

      io.to(room).emit(
        "new-notification",
        notification
      );

      console.log(
        `✅ Notification sent to ${userID}`
      );
    }

    // ==========================================
    // WEB PUSH
    // ==========================================

    await sendWebPushNotification(notification);

    console.log("📡 Notification completed:", {
      userID,
      type,
    });

    return notification;

  } catch (error) {
    console.error(
      "sendNotification error:",
      error
    );

    throw error;
  }
};