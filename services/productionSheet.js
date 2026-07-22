import sheets, { getDatabaseByDivision, updateCell } from "../config/db.js";

import { PROCESS_MAP, PRODUCTION_COLUMNS } from "../constants/processMap.js";
import { appendDispatch } from "./dispatchSheet.js";

// =====================================================
// GET PRODUCTION ORDERS
// =====================================================

export const getProductionOrders = async (division) => {
  if (!division) {
    throw new Error("Division is required");
  }

  const SPREADSHEET_ID = getDatabaseByDivision(division);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,

    range: "Production_Process!A1:AJ",
  });

  return response.data.values || [];
};

// JOB WORK CHECK
const isJobWorkOrder = (row) => {
  const value = String(row[PRODUCTION_COLUMNS.JOB_WORK] || "")
    .trim()
    .toLowerCase();

  return ["yes", "true", "1", "y"].includes(value);
};

// GET PROCESS STATUS
const getProcessStatus = (row, process) => {
  const processMap = PROCESS_MAP[process];

  if (!processMap) {
    throw new Error(`Invalid process: ${process}`);
  }

  const startTime = row[processMap.timeIndex];

  const endTime = row[processMap.endTimeIndex];

  const status =
    processMap.statusIndex !== undefined ? row[processMap.statusIndex] : "";

  // ==========================================
  // COMPLETED
  // ==========================================

  if (status === "Completed" || endTime) {
    return "Completed";
  }

  // ==========================================
  // STARTED
  // ==========================================

  if (startTime) {
    return "In Progress";
  }

  // ==========================================
  // NOT STARTED
  // ==========================================

  return "Pending";
};

// =====================================================
// GET FIRST PROCESS
// =====================================================

const getFirstProcess = (row) => {
  return isJobWorkOrder(row) ? "jobWork" : "warping";
};

// =====================================================
// VALIDATE PREVIOUS PROCESS
// =====================================================

const validatePreviousProcess = (row, process) => {
  const processMap = PROCESS_MAP[process];

  if (!processMap) {
    throw new Error(`Invalid process: ${process}`);
  }

  // ==========================================
  // WARPING
  // ==========================================

  if (process === "warping") {
    // NO JOB WORK
    if (!isJobWorkOrder(row)) {
      return;
    }

    // JOB WORK REQUIRED
    const jobWorkStatus = getProcessStatus(row, "jobWork");

    if (jobWorkStatus !== "Completed") {
      throw new Error("Job Work must be completed before Warping");
    }

    return;
  }

  // ==========================================
  // OTHER PROCESSES
  // ==========================================

  const previousProcess = processMap.previous;

  if (!previousProcess) {
    return;
  }

  const previousStatus = getProcessStatus(row, previousProcess);

  if (previousStatus !== "Completed") {
    throw new Error(`${previousProcess} must be completed first`);
  }
};

// =====================================================
// FIND PRODUCTION ORDER
// =====================================================

const findProductionOrder = (rows, soNo, product) => {
  const index = rows.findIndex(
    (row) =>
      row[PRODUCTION_COLUMNS.SO_NO] === soNo &&
      row[PRODUCTION_COLUMNS.PRODUCT] === product,
  );

  if (index === -1) {
    throw new Error("Production Order Not Found");
  }

  return {
    index,

    // Header row = 1
    // Array index 1 = Sheet row 2
    rowNumber: index + 1,

    row: rows[index],
  };
};

// =====================================================
// START PRODUCTION PROCESS
// =====================================================

export const startProductionProcess = async ({
  soNo,
  product,
  process,
  updatedBy,
  division,
}) => {
  const rows = await getProductionOrders(division);

  const { rowNumber, row } = findProductionOrder(rows, soNo, product);

  const processMap = PROCESS_MAP[process];

  if (!processMap) {
    throw new Error(`Invalid process: ${process}`);
  }

  console.log("SO:", row[PRODUCTION_COLUMNS.SO_NO]);

  console.log("JOB WORK INDEX:", PRODUCTION_COLUMNS.JOB_WORK);

  console.log("JOB WORK RAW:", row[PRODUCTION_COLUMNS.JOB_WORK]);

  console.log("JOB WORK BOOLEAN:", isJobWorkOrder(row));
  // =====================================================
  // JOB WORK VALIDATION
  // =====================================================

  if (process === "jobWork" && !isJobWorkOrder(row)) {
    throw new Error("Job Work is not applicable for this order");
  }

  // =====================================================
  // PREVIOUS PROCESS VALIDATION
  // =====================================================

  validatePreviousProcess(row, process);

  // =====================================================
  // CURRENT STATUS
  // =====================================================

  const currentStatus = getProcessStatus(row, process);

  console.log("PROCESS:", process);

  console.log("CURRENT STATUS:", currentStatus);

  if (currentStatus === "Completed") {
    throw new Error(`${process} is already completed`);
  }

  if (currentStatus === "In Progress") {
    throw new Error(`${process} is already in progress`);
  }

  const now = new Date().toLocaleString();

  // =====================================================
  // START TIME
  // =====================================================

  await updateCell({
    division,

    range: `${processMap.time}${rowNumber}`,

    value: now,
  });

  // =====================================================
  // UPDATED BY
  // =====================================================

  await updateCell({
    division,

    range: `AI${rowNumber}`,

    value: updatedBy || "",
  });

  // =====================================================
  // UPDATED TIME
  // =====================================================

  await updateCell({
    division,

    range: `AJ${rowNumber}`,

    value: now,
  });

  return true;
};

// =====================================================
// COMPLETE PRODUCTION PROCESS
// =====================================================

export const completeProductionProcess = async ({
  soNo,

  product,

  process,

  productionQty,

  updatedBy,

  division,
}) => {
  const rows = await getProductionOrders(division);

  const { rowNumber, row } = findProductionOrder(rows, soNo, product);

  const processMap = PROCESS_MAP[process];

  if (!processMap) {
    throw new Error(`Invalid process: ${process}`);
  }

  // PREVIOUS PROCESS
  validatePreviousProcess(row, process);

  // CURRENT STATUS
  const currentStatus = getProcessStatus(row, process);

  if (currentStatus === "Pending") {
    throw new Error("Process must be started first");
  }

  if (currentStatus === "Completed") {
    throw new Error(`${process} is already completed`);
  }

  // FIRST PROCESS
  const firstProcess = getFirstProcess(row);

  // PRODUCTION QTY
  if (process === firstProcess) {
    if (
      productionQty === undefined ||
      productionQty === null ||
      productionQty === ""
    ) {
      throw new Error("Production Qty is required");
    }

    const qty = Number(productionQty);

    if (Number.isNaN(qty) || qty <= 0) {
      throw new Error("Production Qty must be greater than 0");
    }

    await updateCell({
      division,

      range: `G${rowNumber}`,

      value: qty,
    });
  }

  const now = new Date().toLocaleString();

  // END TIME
  await updateCell({
    division,

    range: `${processMap.endTime}${rowNumber}`,

    value: now,
  });

  // STATUS
  if (processMap.status) {
    await updateCell({
      division,
       range: `${processMap.status}${rowNumber}`,
       value: "Completed",
    });
  }

  // UPDATED BY
  await updateCell({
    division,

    range: `AI${rowNumber}`,

    value: updatedBy || "",
  });

  // UPDATED TIME
  await updateCell({
    division,

    range: `AJ${rowNumber}`,

    value: now,
  });

  // PACKING COMPLETED
  if (process === "packing") {
    await updateCell({
      division,
      range: `AG${rowNumber}`,
      value: "Ready To Dispatch",
    });

    const finalProductionQty = Number(
      process === firstProcess
        ? productionQty
        : row[PRODUCTION_COLUMNS.PRODUCTION_QTY] || 0,
    );

    const wastageQty = Number(row[PRODUCTION_COLUMNS.WASTAGE_QTY] || 0);

    const nettQtyRTD = finalProductionQty - wastageQty;

    await appendDispatch({
      values: [
        soNo, // A
        product, // B
        division, // C
        finalProductionQty, // D
        wastageQty, // E
        nettQtyRTD, // F
        0, // G Dispatch Qty
        nettQtyRTD, // H Available Qty
        "Ready To Dispatch", // I
        now, // J Created At
        now, // K Updated At
      ],
    });
  }

  return true;
};

// =====================================================
// COMPLETE QUALITY + WASTAGE
// =====================================================

export const completeQualityWithWastage = async ({
  soNo,

  product,

  wastageQty,

  updatedBy,

  division,
}) => {
  const rows = await getProductionOrders(division);

  const { rowNumber, row } = findProductionOrder(rows, soNo, product);

  const qualityStatus = getProcessStatus(row, "quality");

  if (qualityStatus === "Pending") {
    throw new Error("Quality process must be started first");
  }

  if (qualityStatus === "Completed") {
    throw new Error("Quality process is already completed");
  }

  const productionQty = Number(row[PRODUCTION_COLUMNS.PRODUCTION_QTY]) || 0;

  if (productionQty <= 0) {
    throw new Error("Production Qty is not available");
  }

  if (wastageQty === undefined || wastageQty === null || wastageQty === "") {
    throw new Error("Wastage Qty is required");
  }

  const wastage = Number(wastageQty);

  if (Number.isNaN(wastage)) {
    throw new Error("Wastage Qty must be a valid number");
  }

  if (wastage < 0) {
    throw new Error("Wastage Qty cannot be negative");
  }

  if (wastage > productionQty) {
    throw new Error("Wastage cannot be greater than Production Qty");
  }

  const nettQtyRTD = productionQty - wastage;

  const now = new Date().toLocaleString();

  // QUALITY END
  await updateCell({
    division,

    range: `V${rowNumber}`,

    value: now,
  });

  // QUALITY STATUS
  await updateCell({
    division,

    range: `U${rowNumber}`,

    value: "Completed",
  });

  // WASTAGE
  await updateCell({
    division,

    range: `W${rowNumber}`,

    value: wastage,
  });

  // NETT QTY RTD
  await updateCell({
    division,

    range: `AH${rowNumber}`,

    value: nettQtyRTD,
  });

  // UPDATED BY
  await updateCell({
    division,

    range: `AI${rowNumber}`,

    value: updatedBy || "",
  });

  // UPDATED TIME
  await updateCell({
    division,

    range: `AJ${rowNumber}`,

    value: now,
  });

  return {
    wastageQty: wastage,

    nettQtyRTD,
  };
};

// =====================================================
// WASTAGE PENDING
// =====================================================

const isWastagePendingAfterQuality = (row) => {
  const wastageQty = row[PRODUCTION_COLUMNS.WASTAGE_QTY];

  const nettQtyRTD = row[PRODUCTION_COLUMNS.NETT_QTY_RTD];

  return (
    wastageQty === undefined ||
    wastageQty === "" ||
    nettQtyRTD === undefined ||
    nettQtyRTD === ""
  );
};

// =====================================================
// GET PRODUCTION BY PROCESS
// =====================================================

export const getProductionByProcess = async (
  process,

  division,
) => {
  const rows = await getProductionOrders(division);

  const data = rows.slice(1);

  const currentProcess = PROCESS_MAP[process];

  if (!currentProcess) {
    throw new Error(`Invalid process: ${process}`);
  }

  const list = data.filter((row) => {
    // CANCELLED
    if (
      String(row[PRODUCTION_COLUMNS.STATUS] || "").toLowerCase() === "cancelled"
    ) {
      return false;
    }

    // JOB WORK
    if (process === "jobWork") {
      return (
        isJobWorkOrder(row) && getProcessStatus(row, "jobWork") !== "Completed"
      );
    }

    // WARPING
    if (process === "warping") {
      const status = getProcessStatus(row, "warping");

      if (status === "Completed") {
        return false;
      }

      if (isJobWorkOrder(row)) {
        return getProcessStatus(row, "jobWork") === "Completed";
      }

      return true;
    }

    // QUALITY
    if (process === "quality") {
      return (
        getProcessStatus(row, "quality") !== "Completed" &&
        getProcessStatus(row, "machine") === "Completed"
      );
    }

    // FINISHING
    if (process === "finishing") {
      if (getProcessStatus(row, "quality") !== "Completed") {
        return false;
      }

      if (isWastagePendingAfterQuality(row)) {
        return false;
      }

      return getProcessStatus(row, "finishing") !== "Completed";
    }

    // OTHER PROCESSES
    if (getProcessStatus(row, process) === "Completed") {
      return false;
    }

    const previousProcess = currentProcess.previous;

    if (!previousProcess) {
      return true;
    }

    return getProcessStatus(row, previousProcess) === "Completed";
  });

  return list.map((row) => ({
    id: `${row[PRODUCTION_COLUMNS.SO_NO]}-${row[PRODUCTION_COLUMNS.PRODUCT]}`,

    soNo: row[PRODUCTION_COLUMNS.SO_NO] || "",

    product: row[PRODUCTION_COLUMNS.PRODUCT] || "",

    productionTargetQty: Number(row[PRODUCTION_COLUMNS.TARGET_QTY]) || 0,

    division: row[PRODUCTION_COLUMNS.DIVISION] || "",

    productionQty: Number(row[PRODUCTION_COLUMNS.PRODUCTION_QTY]) || 0,

    isJobWork: isJobWorkOrder(row),

    processStatus: getProcessStatus(row, process),

    processStartTime: row[currentProcess.timeIndex] || "",

    processEndTime: row[currentProcess.endTimeIndex] || "",

    wastageQty: row[PRODUCTION_COLUMNS.WASTAGE_QTY] || "",

    nettQtyRTD: row[PRODUCTION_COLUMNS.NETT_QTY_RTD] || "",
  }));
};

// =====================================================
// UPDATE WASTAGE
// =====================================================

export const updateProductionWastage = async ({
  soNo,

  product,

  wastageQty,

  updatedBy,

  division,
}) => {
  const rows = await getProductionOrders(division);

  const { rowNumber, row } = findProductionOrder(rows, soNo, product);

  const qualityStatus = getProcessStatus(row, "quality");

  if (qualityStatus !== "Completed") {
    throw new Error("Quality process must be completed first");
  }

  const productionQty = Number(row[PRODUCTION_COLUMNS.PRODUCTION_QTY]) || 0;

  const wastage = Number(wastageQty);

  if (Number.isNaN(wastage)) {
    throw new Error("Wastage Qty must be a valid number");
  }

  if (wastage < 0) {
    throw new Error("Wastage Qty cannot be negative");
  }

  if (wastage > productionQty) {
    throw new Error("Wastage cannot be greater than Production Qty");
  }

  const nettQtyRTD = productionQty - wastage;

  const now = new Date().toLocaleString();

  await updateCell({
    division,

    range: `AE${rowNumber}`,

    value: wastage,
  });

  await updateCell({
    division,

    range: `AF${rowNumber}`,

    value: nettQtyRTD,
  });

  await updateCell({
    division,

    range: `AG${rowNumber}`,

    value: updatedBy || "",
  });

  await updateCell({
    division,

    range: `AH${rowNumber}`,

    value: now,
  });

  return {
    wastageQty: wastage,

    nettQtyRTD,
  };
};
