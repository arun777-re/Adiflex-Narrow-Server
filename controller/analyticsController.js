import {
  getAnalyticsSummary,
  getOrdersAnalytics,
  getSalesAnalytics,
} from "../services/analyticsService.js";

export const getAnalyticsSummaryController = async (
  req,
  res
) => {
  try {
    const {
      period = "month",
      division = "ALL",
    } = req.query;

    const data = await getAnalyticsSummary({
      period,
      division,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Analytics Summary Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics summary",
      error: error.message,
    });
  }
};

export const getOrdersAnalyticsController = async (
  req,
  res
) => {
  try {
    const {
      period = "month",
      division = "ALL",
    } = req.query;

    const data = await getOrdersAnalytics({
      period,
      division,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Orders Analytics Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders analytics",
      error: error.message,
    });
  }
};

export const getSalesAnalyticsController = async (
  req,
  res
) => {
  try {
    const {
      period = "month",
      division = "ALL",
    } = req.query;

    const data = await getSalesAnalytics({
      period,
      division,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Sales Analytics Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch sales analytics",
      error: error.message,
    });
  }
};