import { sendResponse } from "../../helpers/sql/global.helper.js";
import { getFgAvailableQtyService } from "../../services/sql/fg.service.js";
import {
  consumeFGStockService,
  addFGStockService,
  getFGInventoryService,
  updateFGInventoryService,
} from "../../services/sql/fg.service.js";

export const getFGAvailableQtyWithSKU = async (req, res) => {
  try {
    const { sku } = req.params;

    if (!sku?.trim()) {
      return sendResponse({
        res,
        message: "SKU code is mandatory field",
        statusCode: 400,
      });
    }

    const qty = await getFgAvailableQtyService(sku?.trim());

    return sendResponse({
      res,
      success: true,
      message: "FG available quantity fetched successfully",
      statusCode: 200,
      data: qty,
    });

  } catch (error) {
    console.error("Error during get FG qty:", error);

    return sendResponse({
      res,
      success: false,
      message: error.message || "Internal Server Error",
      statusCode: 500,
    });
  }
};

// ==========================================
// CONSUME FG STOCK
// ==========================================
export const consumeFGStock = async (req, res) => {
  try {
    const { sku, qty, updatedBy } = req.body;

    if (!sku?.trim()) {
      return sendResponse({
        res,
        success: false,
        statusCode: 400,
        message: "SKU code is required",
      });
    }

    const quantity = Number(qty);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return sendResponse({
        res,
        success: false,
        statusCode: 400,
        message: "Valid quantity greater than 0 is required",
      });
    }

    const result = await consumeFGStockService({
      sku: sku.trim(),
      qty: quantity,
      updatedBy,
    });

    return sendResponse({
      res,
      success: true,
      statusCode: 200,
      message: "FG Stock Updated",
      data: result,
    });
  } catch (error) {
    console.error("Error during consume FG stock:", error);

    return sendResponse({
      res,
      success: false,
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};


// ==========================================
// ADD FG STOCK
// ==========================================

export const addFGStock = async (req, res) => {
  try {
    const { sku, qty, updatedBy } = req.body;

    if (!sku?.trim()) {
      return sendResponse({
        res,
        success: false,
        statusCode: 400,
        message: "SKU code is required",
      });
    }

    const quantity = Number(qty);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return sendResponse({
        res,
        success: false,
        statusCode: 400,
        message: "Valid quantity greater than 0 is required",
      });
    }

    const result = await addFGStockService({
      sku: sku.trim(),
      qty: quantity,
      updatedBy,
    });

    return sendResponse({
      res,
      success: true,
      statusCode: 200,
      message: "FG Stock Added",
      data: result,
    });
  } catch (error) {
    console.error("Error during add FG stock:", error);

    return sendResponse({
      res,
      success: false,
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};


// ==========================================
// GET ALL FG INVENTORY
// ==========================================

export const getAllFG = async (req, res) => {
  try {
    const inventory = await getFGInventoryService();

    return sendResponse({
      res,
      success: true,
      statusCode: 200,
      message: "FG inventory fetched successfully",
      data: inventory,
      count: inventory.length,
    });
  } catch (error) {
    console.error("Error in getAllFG:", error);

    return sendResponse({
      res,
      success: false,
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};


// ==========================================
// UPDATE FG STOCK
// ==========================================

export const updateStock = async (req, res) => {
  const startTime = Date.now();

  try {
    const { skucode } = req.params;
    const { newFGQty } = req.body;

    console.log("\n========================================");
    console.log("📦 UPDATE FG STOCK START");
    console.log("SKU:", skucode);
    console.log("New FG Qty:", newFGQty);

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!skucode?.trim()) {
      return sendResponse({
        res,
        success: false,
        statusCode: 400,
        message: "SKU Code is required",
      });
    }

    const qty = Number(newFGQty);

    if (!Number.isFinite(qty) || qty < 0) {
      return sendResponse({
        res,
        success: false,
        statusCode: 400,
        message: "Invalid FG quantity",
      });
    }

    // ==========================================
    // UPDATE DIRECTLY IN SQL
    // ==========================================

    const result = await updateFGInventoryService({
      sku: skucode.trim(),
      newFGQty: qty,
    });

    console.log(
      `⏱️ TOTAL LATENCY: ${Date.now() - startTime} ms`
    );

    console.log("✅ FG STOCK UPDATED");
    console.log("========================================\n");

    return sendResponse({
      res,
      success: true,
      statusCode: 200,
      message: "FG stock updated successfully",
      data: result,
    });

  } catch (error) {
    console.error("❌ Error during update stock:", error);

    console.log(
      `⏱️ FAILED REQUEST TIME: ${Date.now() - startTime} ms`
    );

    console.log("========================================\n");

    return sendResponse({
      res,
      success: false,
      statusCode: 500,
      message: error.message || "Error during update stock",
    });
  }
};



