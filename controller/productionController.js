import sheets, { getDatabaseByDivision } from "../config/db.js";
import { PRODUCTION_COLUMNS } from "../constants/processMap.js";

import {
  startProductionProcess,
  completeProductionProcess,
  completeQualityWithWastage,
  getProductionOrders,
  getProductionByProcess,
  updateProductionWastage,
} from "../services/productionSheet.js";
import { getSalesOrders } from "../services/salesOrderSheet.js";

// start production process
export const startProduction = async (req, res) => {
  try {
    const { soNo, product, process, updatedBy, division, cycleID } = req.body;
    if (!soNo || !product || !process) {
      return res.status(400).json({
        success: false,

        message: "SO No, Product and Process are required",
      });
    }

    await startProductionProcess({
      soNo,
      cycleID,
      product,

      process,

      updatedBy,
      division,
    });

    return res.status(200).json({
      success: true,

      message: `${process} Started Successfully`,
    });
  } catch (error) {
    console.log("Error aaya hai bhai:", error);
    return res.status(400).json({
      success: false,

      message: error.message,
    });
  }
};

// complete production process
export const completeProduction = async (req, res) => {
  try {
    const {
      soNo,
      product,
      process,
      productionQty,
      updatedBy,
      division,
      cycleID,
    } = req.body;

    if (!soNo || !product || !process || !division) {
      return res.status(400).json({
        success: false,

        message: "SO No, Product, Division and Process are required",
      });
    }

    await completeProductionProcess({
      soNo,
      cycleID,
      product,
      process,
      productionQty,
      division,
      updatedBy,
    });

    // socket event

    return res.status(200).json({
      success: true,

      message: `${process} Completed Successfully`,
    });
  } catch (error) {
    console.log("Error aaya hai bhai:", error);
    return res.status(400).json({
      success: false,

      message: error.message,
    });
  }
};

// controller for get all production orders

export const getAllProductionOrders = async (req, res) => {
  const { division } = req.params;
  try {
    const rows = await getProductionOrders(division);

    const data = rows.slice(1);

    const productionOrders = data.map((row, index) => ({
      rowNumber: index + 2,
      id:
        row[PRODUCTION_COLUMNS.CYCLE_ID] ||
        `${row[PRODUCTION_COLUMNS.SO_NO]}-${row[PRODUCTION_COLUMNS.PRODUCT]}-${index + 2}`,

      soNo: row[PRODUCTION_COLUMNS.SO_NO] || "",
      cycleID: row[PRODUCTION_COLUMNS.CYCLE_ID] || "",
      skucode: row[PRODUCTION_COLUMNS.SKU_CODE] || "",

      product: row[PRODUCTION_COLUMNS.PRODUCT] || "",
      customer: row[PRODUCTION_COLUMNS.CUSTOMER] || "",

      productionTargetQty: Number(row[PRODUCTION_COLUMNS.TARGET_QTY]) || 0,

      division: row[PRODUCTION_COLUMNS.DIVISION] || "",

      productionQty: Number(row[PRODUCTION_COLUMNS.PRODUCTION_QTY]) || 0,

      isJobWork:
        String(row[PRODUCTION_COLUMNS.JOB_WORK]).toLowerCase() === "true",

      jobWorkStartTime: row[PRODUCTION_COLUMNS.JOB_WORK_START] || "",

      jobWorkEndTime: row[PRODUCTION_COLUMNS.JOB_WORK_END] || "",
      warpingStartAt: row[PRODUCTION_COLUMNS.WARPING_START] || "",

      warping: row[PRODUCTION_COLUMNS.WARPING] || "",

      warpingEndsAt: row[PRODUCTION_COLUMNS.WARPING_END] || "",

      fillingStartAt: row[PRODUCTION_COLUMNS.FILLING_START] || "",

      filling: row[PRODUCTION_COLUMNS.FILLING] || "",

      fillingEndsAt: row[PRODUCTION_COLUMNS.FILLING_END] || "",

      machineStartsAt: row[PRODUCTION_COLUMNS.MACHINE_START] || "",

      machine: row[PRODUCTION_COLUMNS.MACHINE] || "",

      machineEndsAt: row[PRODUCTION_COLUMNS.MACHINE_END] || "",

      qualityStartsAt: row[PRODUCTION_COLUMNS.QUALITY_START] || "",

      quality: row[PRODUCTION_COLUMNS.QUALITY] || "",

      qualityEndsAt: row[PRODUCTION_COLUMNS.QUALITY_END] || "",

      finishingStartsAt: row[PRODUCTION_COLUMNS.FINISHING_START] || "",

      finishing: row[PRODUCTION_COLUMNS.FINISHING] || "",

      finishingEndsAt: row[PRODUCTION_COLUMNS.FINISHING_END] || "",

      rollingStartsAt: row[PRODUCTION_COLUMNS.ROLLING_START] || "",

      rolling: row[PRODUCTION_COLUMNS.ROLLING] || "",

      rollingEndsAt: row[PRODUCTION_COLUMNS.ROLLING_END] || "",

      packingStartsAt: row[PRODUCTION_COLUMNS.PACKING_START] || "",

      packing: row[PRODUCTION_COLUMNS.PACKING] || "",

      packingEndsAt: row[PRODUCTION_COLUMNS.PACKING_END] || "",

      status: row[PRODUCTION_COLUMNS.STATUS] || "",

      wastageQty: Number(row[PRODUCTION_COLUMNS.WASTAGE_QTY]) || 0,

      nettQtyRTD: Number(row[PRODUCTION_COLUMNS.NETT_QTY_RTD]) || 0,

      updatedBy: row[PRODUCTION_COLUMNS.UPDATED_BY] || "",

      updatedTime: row[PRODUCTION_COLUMNS.UPDATED_TIME] || "",
    }));
console.log("productionOrders", productionOrders);
    return res.status(200).json({
      success: true,

      productionOrders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// get production by process controller
export const getProductionProcess = async (req, res) => {
  try {
    const { process } = req.params;

    if (!process) {
      return res.status(400).json({
        success: false,

        message: "Process is required",
      });
    }

    const data = await getProductionByProcess(process);

    return res.status(200).json({
      success: true,

      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message: error.message,
    });
  }
};

// UPDATE WASTAGE

export const updateWastage = async (req, res) => {
  try {
    const { soNo, product, wastageQty, updatedBy } = req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (
      !soNo ||
      !product ||
      wastageQty === undefined ||
      wastageQty === null ||
      wastageQty === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "SO No, Product and Wastage Qty are required",
      });
    }

    // ==========================================
    // UPDATE WASTAGE
    // ==========================================

    const result = await updateProductionWastage({
      soNo,
      product,
      wastageQty,
      updatedBy,
    });
    // socket event
    return res.status(200).json({
      success: true,
      message: "Wastage Updated Successfully",

      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// COMPLETE QUALITY + WASTAGE
// =====================================================

export const completeQuality = async (req, res) => {
  console.log("req.body:", req.body);
  try {
    const { soNo, product, wastageQty, updatedBy, division, cycleID } =
      req.body;
    console.log("req .body", req.body);

    if (!soNo || !division || !product || wastageQty === undefined) {
      return res.status(400).json({
        success: false,

        message: "SO No, Product and Wastage Qty are required",
      });
    }

    const result = await completeQualityWithWastage({
      soNo,
      product,
      wastageQty,
      updatedBy,
      division,
      cycleID,
    });
    return res.status(200).json({
      success: true,
      message: "Quality Completed and Wastage Saved Successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,

      message: error.message,
    });
  }
};

// controllers/salesOrderController.js

export const getAllJobWorkOrders = async (req, res) => {
  try {
    const { division } = req.params;

    // ==========================================
    // 1. VALIDATE DIVISION
    // ==========================================

    if (!division) {
      return res.status(400).json({
        success: false,
        message: "Division is required",
      });
    }

    // ==========================================
    // 3. GET PRODUCTION ORDERS
    // ==========================================
    const rows = await getProductionOrders(division);

    const data = rows.slice(1);

    console.log("rows", rows, "ROWS LENGTH", rows.length);

    if (rows.length <= 1) {
      return res.status(200).json({
        success: true,
        count: rows.length,
        data: [],
      });
    }

    // ==========================================
    // 5. JOB WORK ORDERS
    // ==========================================

    const jobWorkOrders = data
      .filter((row) => {
        const isJobWork = row[PRODUCTION_COLUMNS.JOB_WORK];

        console.log(
          "SO:",
          row[PRODUCTION_COLUMNS.SO_NO],
          "IS_JOB_WORK INDEX:",
          PRODUCTION_COLUMNS.JOB_WORK,
          "VALUE:",
          isJobWork,
        );

        return (
          isJobWork === true ||
          String(isJobWork).trim().toLowerCase() === "true"
        );
      })
      .map((row) => {
        // ========================================
        // JOB WORK STATUS
        // ========================================

        const jobWorkEndTime = String(
          row[PRODUCTION_COLUMNS.JOB_WORK_END] || "",
        ).trim();

        const jobWorkStatus = jobWorkEndTime ? "Fulfilled" : "Pending";

        // ========================================
        // RESPONSE
        // ========================================

        return {
          soNo: row[PRODUCTION_COLUMNS.SO_NO] || "",

          cycleID: row[PRODUCTION_COLUMNS.CYCLE_ID] || "",

          skucode: row[PRODUCTION_COLUMNS.SKU_CODE] || "",

          productName: row[PRODUCTION_COLUMNS.PRODUCT] || "",

          customer: row[PRODUCTION_COLUMNS.CUSTOMER] || "",

          orderType: row[PRODUCTION_COLUMNS.ORDER_TYPE] || "",

          productionTargetQty: Number(
            row[PRODUCTION_COLUMNS.TARGET_QTY] || 0,
          ),

          division: row[PRODUCTION_COLUMNS.DIVISION] || "",

          productionQty: Number(row[PRODUCTION_COLUMNS.PRODUCTION_QTY] || 0),

          isJobWork: true,

          jobWorkStartTime: row[PRODUCTION_COLUMNS.JOB_WORK_START] || "",

          jobWorkEndTime,

          jobWorkStatus,

          updatedBy: row[PRODUCTION_COLUMNS.UPDATED_BY] || "",

          updatedTime: row[PRODUCTION_COLUMNS.UPDATED_TIME] || "",
        };
      });

    // ==========================================
    // 6. RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      count: jobWorkOrders.length,
      data: jobWorkOrders,
    });
  } catch (error) {
    console.error("❌ getAllJobWorkOrders:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch job work orders",
      error: error.message,
    });
  }
};
