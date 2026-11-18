
import webpush from "web-push";
import { randomUUID } from "node:crypto";

import pool from "../config/postgresDB.js";
import {
  getUserPushSubscriptions,
  getSubscriptionsForNotification,
} from "../helpers/pushNotificationHelper.js";

// =====================================================
// VAPID CONFIGURATION
// =====================================================

const vapidConfigured = Boolean(
  process.env.VAPID_SUBJECT &&
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
);

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("⚠️ Web Push VAPID configuration is missing");
}

// =====================================================
// HELPERS
// =====================================================

const buildPushSubscription = (row) => ({
  endpoint: row.endpoint,
  keys: {
    p256dh: row.p256dh,
    auth: row.auth,
  },
});

const isActiveSubscription = (row) =>
  String(row.status || "").trim().toUpperCase() === "ACTIVE";

// =====================================================
// SEND TO ONE DATABASE SUBSCRIPTION
// =====================================================

const sendToSubscription = async ({ row, notification }) => {
  if (!vapidConfigured) {
    return {
      success: false,
      subscriptionId: row.subscription_id,
      error: "VAPID configuration is missing",
    };
  }

  try {
    await webpush.sendNotification(
      buildPushSubscription(row),
      JSON.stringify(notification)
    );

    return {
      success: true,
      subscriptionId: row.subscription_id,
    };
  } catch (error) {
    console.error("❌ Push failed:", {
      subscriptionId: row.subscription_id,
      statusCode: error.statusCode,
      message: error.message,
    });

    // Expired or invalid subscription
    if ([404, 410].includes(error.statusCode)) {
      try {
        await pool.query(
          `
            UPDATE push_subscriptions
            SET
              status = 'INACTIVE',
              updated_at = NOW()
            WHERE id = $1
          `,
          [row.id]
        );

        console.log(
          "♻️ Expired push subscription deactivated:",
          row.subscription_id
        );
      } catch (dbError) {
        console.error(
          "Failed to deactivate subscription:",
          dbError.message
        );
      }
    }

    return {
      success: false,
      subscriptionId: row.subscription_id,
      statusCode: error.statusCode,
      error: error.message,
    };
  }
};

// =====================================================
// SEND PUSH TO ONE RAW SUBSCRIPTION
// =====================================================

export const sendPushNotification = async ({
  subscription,
  notification,
}) => {
  if (!vapidConfigured) {
    return {
      success: false,
      error: "VAPID configuration is missing",
    };
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(notification)
    );

    console.log("✅ PUSH SENT");

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ Push Notification Error:", {
      statusCode: error.statusCode,
      message: error.message,
    });

    return {
      success: false,
      statusCode: error.statusCode,
      error: error.message,
    };
  }
};

// =====================================================
// TEST PUSH
// =====================================================

export const sendTestPush = async ({ userId, notification }) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const userSubscriptions =
    await getUserPushSubscriptions(userId);

  if (!userSubscriptions.length) {
    throw new Error(
      "No active push subscription found for this user"
    );
  }

  const results = await Promise.all(
    userSubscriptions.map((row) =>
      sendToSubscription({
        row,
        notification,
      })
    )
  );

  return {
    success: results.some((result) => result.success),
    results,
  };
};

// =====================================================
// APPLICATION WEB PUSH
// =====================================================

export const sendWebPushNotification = async (notification) => {
  try {
    console.log("📡 Preparing Web Push:", {
      userID: notification.userID,
      role: notification.role,
      division: notification.division,
      type: notification.type,
    });

    let rows = [];

    // USER-SPECIFIC NOTIFICATION
    if (notification.userID) {
      console.log(
        "👤 PUSH TARGET: USER",
        notification.userID
      );

      rows = await getUserPushSubscriptions(
        notification.userID
      );
    }

    // ROLE + DIVISION NOTIFICATION
    else if (notification.role && notification.division) {
      console.log("👥 PUSH TARGET: ROLE + DIVISION", {
        role: notification.role,
        division: notification.division,
      });

      rows = await getSubscriptionsForNotification({
        role: notification.role,
        division: notification.division,
      });
    } else {
      return {
        success: false,
        sent: 0,
        failed: 0,
        message: "No valid notification target",
      };
    }

    console.log(
      `📡 Matching subscriptions: ${rows.length}`
    );

    if (!rows.length) {
      return {
        success: true,
        sent: 0,
        failed: 0,
      };
    }

    const results = await Promise.all(
      rows.map((row) =>
        sendToSubscription({
          row,
          notification,
        })
      )
    );

    const sent = results.filter(
      (result) => result.success
    ).length;

    const failed = results.length - sent;

    console.log("📡 Web Push Result:", {
      sent,
      failed,
    });

    return {
      success: sent > 0,
      sent,
      failed,
      results,
    };
  } catch (error) {
    console.error(
      "❌ sendWebPushNotification error:",
      error
    );

    return {
      success: false,
      sent: 0,
      failed: 0,
      error: error.message,
    };
  }
};

// =====================================================
// SAVE / UPDATE PUSH SUBSCRIPTION
// =====================================================

export const savePushSubscription = async ({
  userId,
  subscription,
  deviceName = "Unknown Device",
  ipAddress = "",
}) => {
  console.log("🔔 SAVE PUSH SUBSCRIPTION START");

  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!subscription?.endpoint) {
    throw new Error("Invalid push subscription");
  }

  const { endpoint, keys } = subscription;

  if (!keys?.p256dh || !keys?.auth) {
    throw new Error("Invalid push subscription keys");
  }

  // ================================================
  // FIND USER IN POSTGRESQL
  // ================================================

  const userResult = await pool.query(
    `
      SELECT
        user_id,
        name,
        role,
        division,
        is_active
      FROM users
      WHERE LOWER(TRIM(user_id)) = LOWER(TRIM($1))
      LIMIT 1
    `,
    [userId]
  );

  if (!userResult.rows.length) {
    throw new Error(`User not found: ${userId}`);
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw new Error("Inactive user cannot subscribe to push notifications");
  }

  // ================================================
  // INSERT OR UPDATE SUBSCRIPTION
  // ================================================

  const subscriptionId = `SUB-${randomUUID()}`;

  const result = await pool.query(
    `
      INSERT INTO push_subscriptions (
        subscription_id,
        user_id,
        user_name,
        role,
        division,
        endpoint,
        p256dh,
        auth,
        device_name,
        ip_address,
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        'ACTIVE', NOW(), NOW()
      )
      ON CONFLICT (endpoint)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        user_name = EXCLUDED.user_name,
        role = EXCLUDED.role,
        division = EXCLUDED.division,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        device_name = EXCLUDED.device_name,
        ip_address = EXCLUDED.ip_address,
        status = 'ACTIVE',
        updated_at = NOW()
      RETURNING
        id,
        subscription_id,
        user_id,
        endpoint,
        status
    `,
    [
      subscriptionId,
      user.user_id,
      user.name,
      user.role,
      user.division,
      endpoint,
      keys.p256dh,
      keys.auth,
      deviceName,
      ipAddress,
    ]
  );

  const savedSubscription = result.rows[0];

  console.log("✅ PUSH SUBSCRIPTION SAVED:", {
    subscriptionId: savedSubscription.subscription_id,
    userId: savedSubscription.user_id,
    status: savedSubscription.status,
  });

  return {
    success: true,
    action: "saved",
    subscriptionId: savedSubscription.subscription_id,
    subscription: savedSubscription,
  };
};
