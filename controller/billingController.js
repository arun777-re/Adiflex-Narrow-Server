import {
  getBillingOrders,
  updateBillingStatus,
} from "../services/billingService.js";

// ==========================================
// GET BILLING ORDERS
// ==========================================
export const fetchBillingOrders = async (req, res) => {
  try {
    const orders = await getBillingOrders();

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get Billing Orders Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch billing orders",
    });
  }
};

// ==========================================
// UPDATE BILLING STATUS
// ==========================================
export const changeBillingStatus = async (req, res) => {
  try {
    const {
      soNo,
      skuCode,
      billingID,
      status,
    } = req.body;

    console.log("billing req output",req.body,"billing id",billingID)
    if (!soNo || !billingID) {
      return res.status(400).json({
        success: false,
        message: "SO No/ billingID is required",
      });
    }

    if (!skuCode) {
      return res.status(400).json({
        success: false,
        message: "SKU Code is required",
      });
    }

 

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Billing status is required",
      });
    }

    await updateBillingStatus({
      soNo,
      skuCode,
      billingID,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Billing status updated successfully",
    });
  } catch (error) {
    console.error("Update Billing Status Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update billing status",
    });
  }
};