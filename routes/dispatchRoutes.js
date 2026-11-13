import express from "express";

import {
  createDispatch,
  billingDone,
} from "../controller/dispatchController.js";
import { challanHistory, confirmDispatch, getPendingDispatches } from "../controller/sql/dispatch.controller.js";
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

  challanHistory,
);
router.post(
  "/billing",

  billingDone,
);

router.post('/confirm',authMiddleware,confirmDispatch)

export default router;
