import {
  getFGAvailableQtyService,
  consumeFGStockService,
  addFGStockService,
  getFGInventory,
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