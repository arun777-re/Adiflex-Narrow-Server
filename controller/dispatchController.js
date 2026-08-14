import sheets from "../config/db.js";
import { DISPATCH_COLUMNS } from "../constants/dispatch.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import {
  getAllDispatchOrders,
  dispatchOrder,
  markDispatchBillingDone,
} from "../services/dispatchSheet.js";

// =====================================================
// GET ALL DISPATCH
// =====================================================

export const getDispatchOrders = async (
  req,

  res,
) => {
  try {
    const dispatchOrders = await getAllDispatchOrders();

    return res.status(200).json({
      success: true,

      dispatchOrders,
    });
  } catch (error) {
    console.error("Get Dispatch Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// DISPATCH ORDER
// =====================================================

export const createDispatch = async (
  req,

  res,
) => {
  try {
    const {
      soNo,
      cycleID,
      product,
      freight,
      freightRs,
      dispatchQty,
      driverName,
      vehicleNo,
      customer,
      partyPO,
    } = req.body;

    if (!driverName?.trim()) {
      throw new Error("Driver Name is required");
    }
    if (!vehicleNo?.trim()) {
      throw new Error("Vehicle No is required");
    }
    if (!soNo?.trim()) {
      throw new Error("SoNo is required");
    }
    if (!product?.trim()) {
      throw new Error("SoNo is required");
    }
    if (
      dispatchQty === undefined ||
      dispatchQty === null ||
      Number.isNaN(Number(dispatchQty)) ||
      Number(dispatchQty) <= 0
    ) {
      throw new Error("Dispatch Qty must be greater than 0");
    }
    if (!customer?.trim()) {
      throw new Error("SoNo is required");
    }

    const result = await dispatchOrder({
      soNo,
      cycleID,
      product,
      freight,
      freightRs,
      dispatchQty,
      driverName,
      partyPO,
      vehicleNo,
    });

    return res.status(200).json({
      success: true,
      message: "Dispatch successful",
      dispatch: result,
    });
  } catch (error) {
    console.error("Dispatch Order Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllCompletedDispatchOrders = async (req, res) => {
  try {
    console.log("gellleeee");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAMES.DISPATCH_SHEET}!A2:V`,
    });

    const rows = response.data.values || [];

    const completedOrders = rows
      .map((row, index) => ({
        rowNumber: index + 2,

        soNo: row[DISPATCH_COLUMNS.SO_NO] || "",
        skuCode: row[DISPATCH_COLUMNS.SKU_CODE] || "",
        cycleID: row[DISPATCH_COLUMNS.CYCLE_ID] || "",
        product: row[DISPATCH_COLUMNS.PRODUCT] || "",
        customer: row[DISPATCH_COLUMNS.CUSTOMER] || "",
        driverName: row[DISPATCH_COLUMNS.DRIVER_NAME] || "",
        vehicleNo: row[DISPATCH_COLUMNS.VEHICLE_NO] || "",
        partyPO: row[DISPATCH_COLUMNS.PARTY_PO] || "",
        route: row[DISPATCH_COLUMNS.ROUTE] || "",
        division: row[DISPATCH_COLUMNS.DIVISION] || "",

        productionQty: Number(row[DISPATCH_COLUMNS.PRODUCTION_QTY]) || 0,

        rate: Number(row[DISPATCH_COLUMNS.RATE]) || 0,

        shippinglocation: row[DISPATCH_COLUMNS.SHIPPING_LOCATION] || "",

        billinglocation: row[DISPATCH_COLUMNS.BILLING_LOCATION] || "",

        freight: row[DISPATCH_COLUMNS.FREIGHT_CHARGES] || false,

        freightRs: Number(row[DISPATCH_COLUMNS.FREIGHT_RS]) || 0,

        wastageQty: Number(row[DISPATCH_COLUMNS.WASTAGE_QTY]) || 0,

        dispatchQty: Number(row[DISPATCH_COLUMNS.DISPATCH_QTY]) || 0,

        availableQty: Number(row[DISPATCH_COLUMNS.AVAILABLE_QTY]) || 0,

        status: row[DISPATCH_COLUMNS.STATUS] || "",
        billing: row[DISPATCH_COLUMNS.BILLING] || "",

        createdAt: row[DISPATCH_COLUMNS.CREATED_AT] || "",

        updatedAt: row[DISPATCH_COLUMNS.UPDATED_AT] || "",
      }))
      .filter((order) => {
        const status = String(order.status).trim().toLowerCase();
        return (
          status === "fully dispatched" || status === "partially dispatched"
        );
      });

    return res.status(200).json({
      success: true,
      completedDispatchOrders: completedOrders,
    });
  } catch (error) {
    console.error("Get Completed Dispatch Orders Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const billingDone = async (req, res) => {
  try {
    const { soNo, cycleID, skuCode } = req.body;
    if (!soNo || !skuCode) {
      throw new Error("Sku code and SO No is mandotary fields");
    }

    const response = await markDispatchBillingDone({ soNo, skuCode, cycleID });
    if (response.billing !== "Done") {
      return res.status(400).json({
        success: false,
        message: "Billing not done",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Billing done successfully",
    });
  } catch (error) {
    console.error("Get Completed Dispatch Orders Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
