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
export const cancelSalesOrder = async (req, res) => {
  try {
    const { soNo } = req.params;
    if (!soNo) {
      return sendResponse({
        res,
        statusCode: 400,
        message:
          "Sales order number (soNo) is required in the request parameters.",
        success: false,
      });
    }

    const result = await cancelSalesOrderService(soNo);

    return sendResponse({
      res,
      statusCode: 200,
      message: `Sales order with so_no ${soNo} has been cancelled successfully.`,
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error cancelling sales order:", error);
    return sendResponse({
      res,
      statusCode: 500,
      message:
        error.message || "An error occurred while cancelling sales order.",
      success: false,
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
