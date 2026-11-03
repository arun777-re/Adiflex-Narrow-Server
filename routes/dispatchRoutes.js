import express from "express";

import {
  getDispatchOrders,
  
  createDispatch,
  getAllCompletedDispatchOrders,
  billingDone,
} from "../controller/dispatchController.js";
import { confirmDispatch, getPendingDispatches } from "../controller/sql/dispatch.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET ALL DISPATCH
router.get("/", authMiddleware, getPendingDispatches);

// DISPATCH QTY
router.post(
  "/",

  createDispatch,
);
// Completed dispatch orders
router.get(
  "/completed",

  getAllCompletedDispatchOrders,
);
router.post(
  "/billing",

  billingDone,
);

router.post('/confirm',authMiddleware,confirmDispatch)

export default router;
