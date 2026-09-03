import express from "express";

import {
  getAnalyticsSummaryController,
  getOrdersAnalyticsController,
  getSalesAnalyticsController,
} from "../controller/analyticsController.js";

const router = express.Router();

router.get(
  "/summary",
  getAnalyticsSummaryController
);

router.get(
  "/orders",
  getOrdersAnalyticsController
);

router.get(
  "/sales",
  getSalesAnalyticsController
);

export default router;