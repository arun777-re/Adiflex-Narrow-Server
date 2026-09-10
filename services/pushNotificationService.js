import webpush from "web-push";
import { appendCell,updateCell } from "../config/db.js";

import {
  getPushSubscriptions,
  getSubscriptionsForNotification,
} from "../helpers/pushNotificationHelper.js";

import {
  USER_COLUMNS,
  SUBSCRIPTION_COLUMNS,
} from "../constants/userColumns.js";

import {SHEET_NAMES} from '../constants/sheetNames.js'
import { getUsers } from "./googleSheets.js";

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
  console.log("\n==========================================");
  console.log("🔔 SAVE PUSH SUBSCRIPTION START");
  console.log("==========================================");
  console.log("👤 Incoming User ID:", userId);

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

  // ===================================================
  // GET USER + SUBSCRIPTIONS IN PARALLEL
  // ===================================================

  console.log("⚡ Fetching users + subscriptions...");

  const [users, subscriptions] = await Promise.all([
    getUsers(),
    getPushSubscriptions(),
  ]);

  console.log("\n==========================================");
  console.log("🔥 PUSH - USERS DEBUG");
  console.log("==========================================");

  console.log("👥 USERS LENGTH:", users?.length);
  console.log(
    "🔢 USER_ID COLUMN INDEX:",
    USER_COLUMNS.USER_ID
  );
  console.log("🔎 LOOKING FOR USER:", userId);

  // ===================================================
  // PRINT ONLY NAME + USER ID
  // ===================================================

  console.log("\n📋 USER ROWS:");

  users.forEach((row, index) => {
    console.log(
      `ROW ${index} =>`,
      "NAME:",
      row?.[USER_COLUMNS.NAME],
      "| USER_ID:",
      row?.[USER_COLUMNS.USER_ID]
    );
  });

  // ===================================================
  // DIRECT OPERATOR CHECK
  // ===================================================

  console.log("\n🎯 DIRECT ROW CHECK:");

  const operatorRow = users?.find(
    (row, index) =>
      index > 0 &&
      String(row?.[USER_COLUMNS.NAME] || "")
        .trim()
        .toLowerCase() === "operator"
  );

  console.log(
    "OPERATOR ROW:",
    operatorRow
      ? {
          name: operatorRow[USER_COLUMNS.NAME],
          userID: operatorRow[USER_COLUMNS.USER_ID],
        }
      : "NOT FOUND"
  );

  console.log(
    "OPERATOR USER_ID:",
    operatorRow?.[USER_COLUMNS.USER_ID]
  );

  // ===================================================
  // NORMALIZED USER ID
  // ===================================================

  const normalizedUserId = String(userId || "")
    .trim()
    .toLowerCase();

  console.log("\n🔎 NORMALIZED USER ID:");
  console.log("Incoming:", normalizedUserId);

  // ===================================================
  // CHECK EVERY USER FOR MATCH
  // ===================================================

  console.log("\n🧪 USER ID MATCH TEST:");

  users.forEach((row, index) => {
    if (index === 0) return;

    const sheetUserId = String(
      row?.[USER_COLUMNS.USER_ID] || ""
    )
      .trim()
      .toLowerCase();

    const isMatch = sheetUserId === normalizedUserId;

    console.log(
      `ROW ${index}:`,
      "Sheet USER_ID =",
      sheetUserId,
      "| Match =",
      isMatch
    );
  });

  // ===================================================
  // FIND USER
  // ===================================================

  const userRowIndex = users.findIndex(
    (row, index) => {
      if (index === 0) return false;

      const sheetUserId = String(
        row?.[USER_COLUMNS.USER_ID] || ""
      )
        .trim()
        .toLowerCase();

      return sheetUserId === normalizedUserId;
    }
  );

  // ===================================================
  // FINAL USER SEARCH RESULT
  // ===================================================

  console.log("\n==========================================");
  console.log("🎯 USER SEARCH RESULT");
  console.log("==========================================");
  console.log("USER ROW INDEX:", userRowIndex);

  if (userRowIndex === -1) {
    console.log("❌ USER NOT FOUND");
    console.log("Incoming User ID:", userId);
    console.log(
      "USER_ID COLUMN INDEX:",
      USER_COLUMNS.USER_ID
    );
    console.log("==========================================\n");

    throw new Error(`User not found: ${userId}`);
  }

  console.log("✅ USER FOUND!");

  const userRow = users[userRowIndex];

  console.log("Matched Row:", {
    rowIndex: userRowIndex,
    name: userRow?.[USER_COLUMNS.NAME],
    userID: userRow?.[USER_COLUMNS.USER_ID],
    role: userRow?.[USER_COLUMNS.ROLE],
    division: userRow?.[USER_COLUMNS.DIVISION],
  });

  // ===================================================
  // GET USER DETAILS
  // ===================================================

  const userName =
    userRow[USER_COLUMNS.NAME] || "";

  const role =
    userRow[USER_COLUMNS.ROLE] || "";

  const division =
    userRow[USER_COLUMNS.DIVISION] || "";

  // ===================================================
  // FIND EXISTING SUBSCRIPTION
  // ===================================================

  console.log("\n==========================================");
  console.log("🔍 CHECKING EXISTING SUBSCRIPTION");
  console.log("==========================================");

  console.log(
    "📦 SUBSCRIPTIONS LENGTH:",
    subscriptions?.length
  );

  const existingIndex = subscriptions.findIndex(
    (row, index) =>
      index > 0 &&
      String(
        row[SUBSCRIPTION_COLUMNS.ENDPOINT] || ""
      ).trim() === String(endpoint).trim()
  );

  console.log(
    "EXISTING SUBSCRIPTION INDEX:",
    existingIndex
  );

  const now = new Date().toISOString();

  // ===================================================
  // UPDATE
  // ===================================================

  if (existingIndex !== -1) {
    console.log("♻️ Existing subscription found");

    const existingRow =
      subscriptions[existingIndex];

    const subscriptionId =
      existingRow[
        SUBSCRIPTION_COLUMNS.SUBSCRIPTION_ID
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
        SUBSCRIPTION_COLUMNS.CREATED_AT
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
      "♻️ PUSH SUBSCRIPTION UPDATED:",
      subscriptionId
    );

    console.log(
      "==========================================\n"
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

  console.log("🆕 No existing subscription found");
  console.log("➡️ Creating new subscription...");

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
    "🆕 PUSH SUBSCRIPTION CREATED:",
    subscriptionId
  );

  console.log(
    "==========================================\n"
  );

  return {
    success: true,
    action: "created",
    subscriptionId,
  };
};