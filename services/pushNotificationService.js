import webpush from "web-push";
import { appendCell,updateCell } from "../config/db.js";

import {
  getUsers,
  getPushSubscriptions,
  getSubscriptionsForNotification,
} from "../helpers/pushNotificationHelper.js";

import {
  USER_COLUMNS,
  SUBSCRIPTION_COLUMNS,
} from "../constants/userColumns.js";

import {SHEET_NAMES} from '../constants/sheetNames.js'

// =====================================================
// VAPID
// =====================================================

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// =====================================================
// HELPERS
// =====================================================

const buildPushSubscription = (row) => ({
  endpoint: row[SUBSCRIPTION_COLUMNS.ENDPOINT],
  keys: {
    p256dh: row[SUBSCRIPTION_COLUMNS.P256DH],
    auth: row[SUBSCRIPTION_COLUMNS.AUTH],
  },
});

const isActiveSubscription = (row) =>
  String(
    row[SUBSCRIPTION_COLUMNS.STATUS] || ""
  )
    .trim()
    .toUpperCase() === "ACTIVE";

const sendToSubscription = async ({
  row,
  notification,
}) => {
  try {
    await webpush.sendNotification(
      buildPushSubscription(row),
      JSON.stringify(notification)
    );

    return {
      success: true,
      subscriptionId:
        row[SUBSCRIPTION_COLUMNS.SUBSCRIPTION_ID],
    };

  } catch (error) {

    console.error("❌ Push failed:", {
      subscriptionId:
        row[SUBSCRIPTION_COLUMNS.SUBSCRIPTION_ID],
      statusCode: error.statusCode,
      message: error.message,
    });

    return {
      success: false,
      subscriptionId:
        row[SUBSCRIPTION_COLUMNS.SUBSCRIPTION_ID],
      statusCode: error.statusCode,
      error: error.message,
    };
  }
};

// =====================================================
// SEND PUSH TO ONE SUBSCRIPTION
// =====================================================

export const sendPushNotification = async ({
  subscription,
  notification,
}) => {

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

export const sendTestPush = async ({
  userId,
  notification,
}) => {

  if (!userId) {
    throw new Error("User ID is required");
  }

  const rows = await getPushSubscriptions();
  console.log("push_rows",rows)

  const userSubscriptions = rows
    .slice(1)
    .filter(
      (row) =>
        String(
          row[SUBSCRIPTION_COLUMNS.USER_ID] || ""
        ).trim() === String(userId).trim() &&
        isActiveSubscription(row)
    );

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
    success: results.some(
      (result) => result.success
    ),
    results,
  };
};

// =====================================================
// APPLICATION PUSH
// =====================================================

export const sendWebPushNotification = async (
  notification
) => {

  console.log("📡 Preparing Web Push:", {
    role: notification.role,
    division: notification.division,
    type: notification.type,
  });

  const rows =
    await getSubscriptionsForNotification({
      role: notification.role,
      division: notification.division,
    });

  console.log(
    `📡 Matching subscriptions: ${rows.length}`
  );

  if (!rows.length) {
    console.log(
      "⚠️ No matching active push subscriptions"
    );

    return {
      success: true,
      sent: 0,
      failed: 0,
    };
  }

  // IMPORTANT:
  // Sequential await ki jagah parallel push
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

  const failed =
    results.length - sent;

  console.log("📡 Web Push Result:", {
    sent,
    failed,
  });

  return {
    success: true,
    sent,
    failed,
  };
};

// =====================================================
// SAVE / UPDATE SUBSCRIPTION
// =====================================================

export const savePushSubscription = async ({
  userId,
  subscription,
  deviceName = "Unknown Device",
  ipAddress = "",
}) => {

  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!subscription?.endpoint) {
    throw new Error(
      "Invalid push subscription"
    );
  }

  const { endpoint, keys } =
    subscription;

  if (!keys?.p256dh || !keys?.auth) {
    throw new Error(
      "Invalid push subscription keys"
    );
  }

  // ===================================================
  // GET USER + SUBSCRIPTIONS IN PARALLEL
  // ===================================================

  const [users, subscriptions] =
    await Promise.all([
      getUsers(),
      getPushSubscriptions(),
    ]);

  // ===================================================
  // FIND USER
  // ===================================================

  const userRowIndex =
    users.findIndex(
      (row, index) =>
        index > 0 &&
        String(
          row[USER_COLUMNS.USER_ID] || ""
        ).trim() ===
        String(userId).trim()
    );

  if (userRowIndex === -1) {
    throw new Error(
      `User not found: ${userId}`
    );
  }

  const userRow =
    users[userRowIndex];

  const userName =
    userRow[USER_COLUMNS.NAME] || "";

  const role =
    userRow[USER_COLUMNS.ROLE] || "";

  const division =
    userRow[USER_COLUMNS.DIVISION] || "";

  // ===================================================
  // FIND EXISTING SUBSCRIPTION
  // ===================================================

  const existingIndex =
    subscriptions.findIndex(
      (row, index) =>
        index > 0 &&
        String(
          row[
            SUBSCRIPTION_COLUMNS.ENDPOINT
          ] || ""
        ).trim() ===
        String(endpoint).trim()
    );

  const now =
    new Date().toISOString();

  // ===================================================
  // UPDATE
  // ===================================================

  if (existingIndex !== -1) {

    const existingRow =
      subscriptions[existingIndex];

    const subscriptionId =
      existingRow[
        SUBSCRIPTION_COLUMNS
          .SUBSCRIPTION_ID
      ];

    const updatedRow = [
      subscriptionId,
      userId,
      userName,
      role,
      division,
      endpoint,
      keys.p256dh,
      keys.auth,
      deviceName,
      ipAddress,
      existingRow[
        SUBSCRIPTION_COLUMNS
          .CREATED_AT
      ] || now,
      now,
      "ACTIVE",
    ];

    await updateCell({
      spreadsheetId:
        process.env.GOOGLE_SHEET_ID,

      sheetName:
        SHEET_NAMES.PUSH_SHEET,

      range:
        `A${existingIndex + 1}:M${existingIndex + 1}`,

      value: updatedRow,
    });

    console.log(
      "♻️ PUSH SUBSCRIPTION UPDATED",
      subscriptionId
    );

    return {
      success: true,
      action: "updated",
      subscriptionId,
    };
  }

  // ===================================================
  // CREATE
  // ===================================================

  const subscriptionId =
    `SUB${Date.now()}`;

  const newRow = [
    subscriptionId,
    userId,
    userName,
    role,
    division,
    endpoint,
    keys.p256dh,
    keys.auth,
    deviceName,
    ipAddress,
    now,
    now,
    "ACTIVE",
  ];

  await appendCell({
    spreadsheetId:
      process.env.GOOGLE_SHEET_ID,

    sheetName:
      SHEET_NAMES.PUSH_SHEET,

    range: "A:M",

    value: newRow,
  });

  console.log(
    "🆕 PUSH SUBSCRIPTION CREATED",
    subscriptionId
  );

  return {
    success: true,
    action: "created",
    subscriptionId,
  };
};