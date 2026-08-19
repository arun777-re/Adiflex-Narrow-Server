import express from "express";
import { changeBillingStatus, fetchBillingOrders } from "../controller/billingController.js";



const router = express.Router();

// GET all billing orders
router.get("/", fetchBillingOrders);

// UPDATE billing status
router.patch("/status", changeBillingStatus);

export default router;