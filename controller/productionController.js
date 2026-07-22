import { PRODUCTION_COLUMNS } from "../constants/processMap.js";

import {
  startProductionProcess,
  completeProductionProcess,
  completeQualityWithWastage,
  getProductionOrders,
  getProductionByProcess,
  updateProductionWastage,
} from "../services/productionSheet.js";

// start production process
export const startProduction = async (req, res) => {
  try {
    const { soNo, product, process, updatedBy,division } = req.body;

    if (!soNo || !product || !process) {
      return res.status(400).json({
        success: false,

        message: "SO No, Product and Process are required",
      });
    }

    await startProductionProcess({
      soNo,

      product,

      process,

      updatedBy,
      division
    });

    return res.status(200).json({
      success: true,

      message: `${process} Started Successfully`,
    });
  } catch (error) {
    console.log("Error aaya hai bhai:",error);
    return res.status(400).json({
      success: false,

      message: error.message,
    });
  }
};

// complete production process
export const completeProduction = async (req, res) => {
  try {
    const { soNo, product, process, productionQty, updatedBy,division } = req.body;

    if (!soNo || !product || !process || !division) {
      return res.status(400).json({
        success: false,

        message: "SO No, Product, Division and Process are required",
      });
    }

    await completeProductionProcess({
      soNo,

      product,

      process,

      productionQty,
      division,

      updatedBy,
    });

    return res.status(200).json({
      success: true,

      message: `${process} Completed Successfully`,
    });
  } catch (error) {
    console.log("Error aaya hai bhai:",error)
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

    const productionOrders = data.map((row) => ({
      id: `${row[PRODUCTION_COLUMNS.SO_NO]}-${row[PRODUCTION_COLUMNS.PRODUCT]}`,

      soNo: row[PRODUCTION_COLUMNS.SO_NO] || "",

      product: row[PRODUCTION_COLUMNS.PRODUCT] || "",

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

      yarnBeamStartAt: row[PRODUCTION_COLUMNS.YARN_BEAM_START] || "",

      yarnBeam: row[PRODUCTION_COLUMNS.YARN_BEAM] || "",

      yarnBeamEndsAt: row[PRODUCTION_COLUMNS.YARN_BEAM_END] || "",

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
  try {
    const { soNo, product, wastageQty, updatedBy,division } = req.body;
    console.log("req .body",req.body);

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
      division
    });

    return res.status(200).json({
      success: true,

      message: "Quality Completed and Wastage Saved Successfully",

      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message: error.message,
    });
  }
};
