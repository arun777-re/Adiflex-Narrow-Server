import { getIO } from "../socket/socket.js";
import { sendWebPushNotification } from "../services/pushNotificationService.js";
import pool from "../config/postgresDB.js";

export const sendNotification = async ({
  userID = null,
  role = null,
  division = null,
  type,
  title,
  message,
  reference = "",
}) => {
  try {
    // =====================================================
    // 1. SAVE NOTIFICATION IN POSTGRESQL
    // =====================================================

    const query = `
      INSERT INTO notifications (
        user_id,
        role,
        division,
        type,
        title,
        message,
        reference,
        is_read,
        read_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NULL, NOW())
      RETURNING
        id,
        user_id,
        role,
        division,
        type,
        title,
        message,
        reference,
        is_read,
        read_at,
        created_at
    `;

    const result = await pool.query(query, [
      userID || null,
      role || null,
      division || null,
      type,
      title,
      message,
      reference || "",
    ]);

    const savedNotification = result.rows[0];

    // Frontend-compatible notification object
    const notification = {
      id: savedNotification.id,
      userID: savedNotification.user_id,
      role: savedNotification.role,
      division: savedNotification.division,
      type: savedNotification.type,
      title: savedNotification.title,
      message: savedNotification.message,
      reference: savedNotification.reference,
      read: savedNotification.is_read,
      readAt: savedNotification.read_at,
      createdAt: savedNotification.created_at,
    };

    console.log("✅ Notification saved in PostgreSQL:", notification.id);

    // =====================================================
    // 2. REALTIME SOCKET NOTIFICATION
    // =====================================================

    try {
      const io = getIO();

      if (io && userID) {
        io.to(`user:${userID}`).emit("new-notification", notification);

        console.log(`✅ Socket notification sent to ${userID}`);
      }
    } catch (error) {
      console.error("Socket notification failed:", error.message);
    }

    // =====================================================
    // 3. WEB PUSH NOTIFICATION
    // =====================================================

    try {
      await sendWebPushNotification(notification);

      console.log("✅ Web push notification completed");
    } catch (error) {
      console.error("Web push notification failed:", error.message);
    }

    return notification;
  } catch (error) {
    console.error("sendNotification error:", error);
    throw error;
  }
};
