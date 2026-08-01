import {
  getAdminDashboardService,
} from "../services/dashboardService.js";

// ADMIN DASHBOARD

export const getAdminDashboard = async (
  req,
  res
) => {
  try {
    const dashboard =
      await getAdminDashboardService();

    return res.status(200).json({
      success: true,
      dashboard,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};