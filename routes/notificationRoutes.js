import express from "express";
import {
  subscribeToPush,
  testPushNotification,
} from "../controller/notificationController.js";

const router = express.Router();

router.post("/subscribe", subscribeToPush);
router.post("/test",testPushNotification);

export default router;