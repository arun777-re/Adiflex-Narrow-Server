import {
  savePushSubscription,
  sendTestPush,
} from "../services/pushNotificationService.js";

// =====================================================
// SUBSCRIBE TO PUSH
// =====================================================

export const subscribeToPush = async (req, res) => {
  try {
    const subscription = req.body;
    console.log("body in coming request",req.body);

    if (!subscription?.endpoint) {
      return res.status(400).json({
        success: false,
        message: "Push subscription is required",
      });
    }

    // Auth middleware se user ID
    const {userId} = req.body;
    console.log("userId",userId)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found",
      });
    }

    const result = await savePushSubscription({
      userId,
      subscription,
      deviceName:
        req.body?.deviceName || "Unknown Device",
      ipAddress:
        req.ip || "",
    });

    console.log("🔔 PUSH SUBSCRIPTION SAVED");

    return res.status(201).json({
      success: true,
      message: "Push subscription saved",
      data: result,
    });

  } catch (error) {
    console.error("Subscribe Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to subscribe for push notifications",
    });
  }
};


// =====================================================
// TEST PUSH
// =====================================================

export const testPushNotification = async (req, res) => {
  try {

    const {userId} = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found",
      });
    }

    const result = await sendTestPush({
      userId,
      notification: {
        title: "🔥 Adiflex ERP",
        message: "Push notification successfully working!",
        type: "test",
        reference: "TEST-001",
      },
    });

    return res.json({
      success: true,
      message: "Test push sent",
      data: result,
    });

  } catch (error) {
    console.error("Test Push Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};