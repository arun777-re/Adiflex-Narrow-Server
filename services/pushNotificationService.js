import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);




let testSubscription = null;

export const savePushSubscription = (subscription) => {
  testSubscription = subscription;

  console.log("🔔 PUSH SUBSCRIPTION SAVED");
};

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

    return true;
  } catch (error) {
    console.error("❌ Push Notification Error:", error);

    return false;
  }
};

export const sendTestPush = async (notification) => {
  if (!testSubscription) {
    throw new Error("No push subscription available");
  }

  return sendPushNotification({
    subscription: testSubscription,
    notification,
  });
};

// 🔥 Actual application notification
export const sendWebPushNotification = async (notification) => {
  if (!testSubscription) {
    console.log("⚠️ No push subscription available");
    return false;
  }

  return sendPushNotification({
    subscription: testSubscription,
    notification,
  });
};