import { PROCESS_MAP, PRODUCTION_COLUMNS } from "../constants/processMap.js";
import {
  completeProductionProcess,
  getProductionOrders,
} from "../services/productionSheet.js";

// Complete Production Process

export const updateProductionProcess = async (req, res) => {
  try {
    const { soNo, product, process, productionQty, updatedBy } = req.body;
    
    
    await completeProductionProcess({
      soNo,
      product,
      process,
      productionQty,
      updatedBy,
    });

    return res.status(200).json({
      success: true,
      message: `${process} Completed Successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get all production processes
export const getAllProductionOrders = async (req, res) => {
  try {
    const rows = await getProductionOrders();

    const data = rows.slice(1);

    const productionOrders = data.map((row) => ({
      soNo: row[0] || "",
      product: row[1] || "",
      productionTargetQty: Number(row[2]) || 0,
      division: row[3] || "",
      productionQty: Number(row[4]) || 0,

      warping: row[5] || "",
      warpingEndsAt: row[6] || "",

      yarnBeam: row[7] || "",
      yarnBeamEndsAt: row[8] || "",

      machine: row[9] || "",
      machineEndsAt: row[10] || "",

      quality: row[11] || "",
      qualityEndsAt: row[12] || "",

      finishing: row[13] || "",
      finishingEndsAt: row[14] || "",

      rolling: row[15] || "",
      rollingEndsAt: row[16] || "",

      packing: row[17] || "",
      packingEndsAt: row[18] || "",

      status: row[19] || "",

      wastageQty: Number(row[20]) || 0,

      nettQtyRTD: Number(row[21]) || 0,

      jobWork: row[22] || "",
      jobWorkCompletedAt: row[23] || "",

      updatedBy: row[24] || "",
      updatedTime: row[25] || "",
    }));

    res.status(200).json({
      success: true,
      productionOrders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get production by process
export const getProductionByProcess = async (req, res) => {
  try {
    const { process } = req.params;
console.log("params",process)
    const rows = await getProductionOrders();

    const data = rows.slice(1);
    const currentProcess = PROCESS_MAP[process];

    if (!currentProcess) {
      return res.status(400).json({
        success: false,
        message: "Invalid Process",
      });
    }

   const list = data.filter((row) => {

  if (row[currentProcess.statusIndex] === "Completed") {
    return false;
  }

  if (!currentProcess.previous) {
    return row[PRODUCTION_COLUMNS.STATUS] !== "Cancelled";
  }

  const previousProcess =
    PROCESS_MAP[currentProcess.previous];

  return (
    row[previousProcess.statusIndex] === "Completed" &&
    row[PRODUCTION_COLUMNS.STATUS] !== "Cancelled"
  );

});

    const result = list.map((row) => ({
      soNo: row[PRODUCTION_COLUMNS.SO_NO],
      product: row[PRODUCTION_COLUMNS.PRODUCT],
      productionTargetQty: row[PRODUCTION_COLUMNS.TARGET_QTY],
      division: row[PRODUCTION_COLUMNS.DIVISION],
      productionQty: row[PRODUCTION_COLUMNS.PRODUCTION_QTY],
      status: row[PRODUCTION_COLUMNS.STATUS],
    }));

    res.status(200).json({
      success: true,
      data:result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update wastage
export const updateWastage = async (req, res) => {
  try {
    const { soNo, product, wastageQty, updatedBy } = req.body;

    await updateProductionWastage({
      soNo,
      product,
      wastageQty,
      updatedBy,
    });

    return res.status(200).json({
      success: true,

      message: "Wastage Updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
