import { savePushSubscription, sendPushNotification } from "../services/pushNotificationService.js"; 
import { sendTestPush } from "../services/pushNotificationService.js";


export const subscribeToPush = async (req, res) => {
  try {
    const subscription = req.body;

    if (!subscription?.endpoint) {
      return res.status(400).json({
        success: false,
        message: "Push subscription is required",
      });
    }

    // Abhi temporary console.
    // Next step mein Google Sheet / DB mein save karenge.
    savePushSubscription(subscription)
   console.log("🔔 PUSH SUBSCRIPTION SAVED");

    return res.status(201).json({
      success: true,
      message: "Push subscription saved",
    });
  } catch (error) {
    console.error("Subscribe Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to subscribe for push notifications",
    });
  }
};


export const testPushNotification = async (req, res) => {
  try {
    await sendTestPush({
      title: "🔥 Adiflex ERP",
      message: "Push notification successfully working!",
      type: "test",
      reference: "TEST-001",
    });

    return res.json({
      success: true,
      message: "Test push sent",
    });
  } catch (error) {
    console.error("Test Push Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};