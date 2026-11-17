import {
  getSalesOrdersService,
  cancelSalesOrderService,
  updateSalesOrderService,
  createSalesOrderService,
} from "../../services/sql/salesOrder.service.js";
import { sendResponse } from "../../helpers/sql/global.helper.js";

// get all sales orders
export const getAllSalesOrders = async (req, res) => {
  try {
    const orders = await getSalesOrdersService();
console.log("orders sss s s s s s  s",orders);
    return res.status(200).json({
      success: true,
      messgae: "Sales Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching sales orders:", error);
    return sendResponse({
      res,
      statusCode: 500,
      message:
        error.message || "An error occurred while fetching sales orders.",
      success: false,
    });
  }
};

// Cancel Sales Order

export const cancelSalesOrderController = async (req, res) => {
  try {
    const { soNo, salesItemId } = req.params;

    const {
      cancelledQtyMeter,
      reasonCode,
      reason,
      remarks,
    } = req.body;

    // ----------------------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------------------

    if (!soNo) {
      return res.status(400).json({
        success: false,
        message: "Sales Order Number is required.",
      });
    }

    if (!salesItemId || !Number.isInteger(Number(salesItemId))) {
      return res.status(400).json({
        success: false,
        message: "Valid Sales Item ID is required.",
      });
    }

    if (
      cancelledQtyMeter === undefined ||
      !Number.isFinite(Number(cancelledQtyMeter)) ||
      Number(cancelledQtyMeter) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid cancellation quantity is required.",
      });
    }

    if (!reasonCode || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required.",
      });
    }

    // ----------------------------------------------------
    // SERVICE CALL
    // ----------------------------------------------------

    const result = await cancelSalesOrderService({
      soNo,
      salesItemId: Number(salesItemId),
      cancelledQtyMeter: Number(cancelledQtyMeter),
      reasonCode,
      reason: reason.trim(),
      remarks: remarks || null,
      cancelledBy: req.user?.id ?? null,
    });

    return res.status(200).json({
      success: true,
      message: "Sales Order item cancelled successfully.",
      data: result,
    });

  } catch (error) {
    console.error("Cancel Sales Order Controller Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to cancel Sales Order item.",
    });
  }
};


export const updateSalesOrder = async (req, res) => {
  try {
    const { soNo } = req.params;
    if (!soNo) {
      console.warn(
        "Sales order number (soNo) is required in the request parameters.",
      );
      return sendResponse({
        res,
        statusCode: 400,
        message:
          "Sales order number (soNo) is required in the request parameters.",
        success: false,
      });
    }

    const {
      soQty,
      rate,
      rateadjustment,
      finalrate,
      unit,
      jobWork,
      shippinglocation,
      billinglocation,
      route,
      skucode,
    } = req.body;

    const updateData = {
      soQty,
      rate,
      rateadjustment,
      finalrate,
      unit,
      jobWork,
      shippinglocation,
      billinglocation,
      route,
      skucode,
    };

    const hasNoValue = Object.values(updateData).every(
      (value) =>
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === ""),
    );

    if (hasNoValue) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "At least one field must be provided.",
        success: false,
      });
    }
    console.log("req.body", req.body);

    const result = await updateSalesOrderService({
      soNo,
      soQty,
      rate,
      rateadjustment,
      finalrate,
      unit,
      jobWork,
      shippinglocation,
      billinglocation,
      route,
      skucode,
    });

    if (!result) {
      console.warn(`Sales order with so_no ${soNo} not found.`);
      return sendResponse({
        res,
        statusCode: 404,
        message: `Sales order with so_no ${soNo} not found.`,
        success: false,
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: `Sales order with so_no ${soNo} has been updated successfully.`,
      data: result,
    });
  } catch (error) {
    console.error("Error updating sales order:", error);
    return sendResponse({
      res,
      statusCode: 500,
      message:
        error.message || "An error occurred while updating the sales order.",
      success: false,
    });
  }
};


export const createSalesOrder = async (req, res) => {
  try {
    const result = await createSalesOrderService(req);
    return sendResponse({
      success: true,
      statusCode: 201,
      data: result,
      res,
    });
  } catch (error) {
    console.error("Create Sales order error:", error);
    return sendResponse({
      res,
      success: false,
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};


