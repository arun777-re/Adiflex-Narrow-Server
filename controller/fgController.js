import { FG_COLUMNS } from "../constants/FGColumns.js";
import {
  getFGAvailableQtyService,
  consumeFGStockService,
  addFGStockService,
  getFGInventory,
  updateFGInventoryRow,
} from "../services/fgSheets.js";

// ==========================================
// GET FG AVAILABLE QTY
// ==========================================
export const getFGAvailableQty = async (req, res) => {
  try {
    const { sku } = req.params;

    const qty = await getFGAvailableQtyService(sku);

    return res.status(200).json({
      success: true,
      availableQty: qty,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// CONSUME FG STOCK
// ==========================================
export const consumeFGStock = async (req, res) => {
  try {
    const { sku, qty, updatedBy } = req.body;

    await consumeFGStockService({
      sku,
      qty,
      updatedBy,
    });

    return res.status(200).json({
      success: true,
      message: "FG Stock Updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// ADD FG STOCK
// ==========================================
export const addFGStock = async (req, res) => {
  try {
    const { sku, qty, updatedBy } = req.body;

    await addFGStockService({
      sku,
      qty,
      updatedBy,
    });

    return res.status(200).json({
      success: true,
      message: "FG Stock Added",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get all inventory
export const getAllFG = async (req, res) => {
  try {
    const inventory = await getFGInventory();

    return res.status(200).json({
      success: true,
      count: inventory.length > 0 ? inventory.length - 1 : 0, // Header exclude
      data: inventory.slice(1), // Header remove
    });
  } catch (error) {
    console.log("Error in getAllFG:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateStock = async (req, res) => {
  const startTime = Date.now();

  try {
    const { skucode } = req.params;
    const { newFGQty } = req.body;

    console.log("\n========================================");
    console.log("📦 UPDATE STOCK START");
    console.log("SKU:", skucode);
    console.log("New FG Qty:", newFGQty);

    // -----------------------------
    // Validation
    // -----------------------------
    const validationStart = Date.now();

    if (!skucode?.trim()) {
      return res.status(400).json({
        success: false,
        message: "SKU Code is required",
      });
    }

    const qty = Number(newFGQty);

    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid FG quantity",
      });
    }

    console.log(
      `⏱️ Validation: ${Date.now() - validationStart} ms`
    );

    // -----------------------------
    // Get inventory
    // -----------------------------
    const inventoryStart = Date.now();

    const inventory = await getFGInventory();

    console.log(
      `⏱️ getFGInventory(): ${Date.now() - inventoryStart} ms`
    );

    console.log("📊 Inventory rows:", inventory.length);

    if (!inventory.length) {
      return res.status(404).json({
        success: false,
        message: "FG Inventory is empty",
      });
    }

    // -----------------------------
    // Find SKU
    // -----------------------------
    const findStart = Date.now();

    const normalizedSKU = skucode.trim().toUpperCase();

    const rowIndex = inventory.findIndex((row, index) => {
      if (index === 0) return false;

      return (
        String(row[FG_COLUMNS.SKU_CODE] || "")
          .trim()
          .toUpperCase() === normalizedSKU
      );
    });

    console.log(
      `⏱️ SKU search: ${Date.now() - findStart} ms`
    );

    if (rowIndex === -1) {
      console.log(`❌ SKU ${skucode} not found`);

      return res.status(404).json({
        success: false,
        message: `SKU ${skucode} not found in FG Inventory`,
      });
    }

    // -----------------------------
    // Row information
    // -----------------------------
    const rowNumber = rowIndex + 1;

    const oldFGQty = Number(
      inventory[rowIndex][FG_COLUMNS.AVAILABLE_QTY] || 0
    );

    console.log("🔎 SKU found");
    console.log("Sheet Row:", rowNumber);
    console.log("Old FG Qty:", oldFGQty);
    console.log("New FG Qty:", qty);

    // -----------------------------
    // Same quantity
    // -----------------------------
    if (oldFGQty === qty) {
      console.log("ℹ️ Stock already up to date");
      console.log(
        `⏱️ TOTAL: ${Date.now() - startTime} ms`
      );
      console.log("========================================\n");

      return res.status(200).json({
        success: true,
        message: "Stock is already up to date",
        data: {
          skucode,
          oldFGQty,
          newFGQty: qty,
        },
      });
    }

    // -----------------------------
    // Update FG Qty
    // -----------------------------
    const updateStart = Date.now();

    await updateFGInventoryRow({
      rowNumber,
      fgAvailableQty: qty,
    });

    console.log(
      `⏱️ updateFGInventoryRow(): ${Date.now() - updateStart} ms`
    );

    // -----------------------------
    // Total latency
    // -----------------------------
    const totalTime = Date.now() - startTime;

    console.log("✅ STOCK UPDATED SUCCESSFULLY");
    console.log(`⏱️ TOTAL LATENCY: ${totalTime} ms`);
    console.log("========================================\n");

    return res.status(200).json({
      success: true,
      message: "FG stock updated successfully",
      data: {
        skucode,
        oldFGQty,
        newFGQty: qty,
      },
    });
  } catch (error) {
    console.error("❌ Error during update stock:", error);

    console.log(
      `⏱️ FAILED REQUEST TIME: ${Date.now() - startTime} ms`
    );

    console.log("========================================\n");

    return res.status(500).json({
      success: false,
      message: "Error during update stock",
    });
  }
};

