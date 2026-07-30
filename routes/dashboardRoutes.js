import express from "express";


import { getAdminDashboard } from "../controller/dashboardController.js";

const router = express.Router();

// ADMIN DASHBOARD

router.get(
  "/admin",
  getAdminDashboard
);

export default router;