import sheets, { updateCell } from "../config/db.js";

import { PROCESS_MAP, PRODUCTION_COLUMNS } from "../constants/processMap.js";

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// =====================================================
// GET PRODUCTION ORDERS
// =====================================================

export const getProductionOrders = async () => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,

    range: "Production_Process!A:AH",
  });

  return response.data.values || [];
};

// =====================================================
// CHECK JOB WORK
// =====================================================

const isJobWorkOrder = (row) => {
  const value = String(row[PRODUCTION_COLUMNS.JOB_WORK] || "")
    .trim()
    .toLowerCase();

  return ["yes", "true", "1", "y"].includes(value);
};

// =====================================================
// GET PROCESS STATUS
// =====================================================

const getProcessStatus = (row, process) => {
  const processMap = PROCESS_MAP[process];

  if (!processMap) {
    throw new Error(`Invalid process: ${process}`);
  }

  // ==========================================
  // JOB WORK
  // ==========================================

  if (process === "jobWork") {
    const start = row[PRODUCTION_COLUMNS.JOB_WORK_START] || "";

    const end = row[PRODUCTION_COLUMNS.JOB_WORK_END] || "";

    if (end) {
      return "Completed";
    }

    if (start) {
      return "In Progress";
    }

    return "Pending";
  }

  // ==========================================
  // OTHER PROCESSES
  // ==========================================

  const start = row[processMap.timeIndex] || "";

  const end = row[processMap.endTimeIndex] || "";

  if (end) {
    return "Completed";
  }

  if (start) {
    return "In Progress";
  }

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

const validatePreviousProcess =
  (
    row,
    process
  ) => {

    const processMap =
      PROCESS_MAP[process];


    if (!processMap) {

      throw new Error(
        `Invalid process: ${process}`
      );

    }


    // =================================================
    // WARPING SPECIAL CASE
    // =================================================

    if (

      process ===
      "warping"

    ) {


      // ===============================================
      // WITHOUT JOB WORK
      // ===============================================

      if (

        !isJobWorkOrder(row)

      ) {

        // Warping is the first process.
        // No previous process required.

        return;

      }


      // ===============================================
      // WITH JOB WORK
      // ===============================================

      const jobWorkStatus =
        getProcessStatus(

          row,

          "jobWork"

        );


      if (

        jobWorkStatus !==
        "Completed"

      ) {

        throw new Error(

          "jobWork is not completed yet"

        );

      }


      return;

    }


    // =================================================
    // OTHER PROCESSES
    // =================================================

    const previousProcess =
      processMap.previous;


    if (

      !previousProcess

    ) {

      return;

    }


    const previousStatus =
      getProcessStatus(

        row,

        previousProcess

      );


    if (

      previousStatus !==
      "Completed"

    ) {

      throw new Error(

        `${previousProcess} is not completed yet`

      );

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

    // Header row = row 1
    // Data index 1 = Sheet row 2
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
}) => {
  const rows = await getProductionOrders();

  const {
    rowNumber,

    row,
  } = findProductionOrder(
    rows,

    soNo,

    product,
  );

  const processMap = PROCESS_MAP[process];

  if (!processMap) {
    throw new Error(`Invalid process: ${process}`);
  }

  // ==========================================
  // PREVIOUS PROCESS VALIDATION
  // ==========================================
  console.log("========== DEBUG WARPING ==========");

  console.log("SO NO:", soNo);
  console.log("PRODUCT:", product);

  console.log("JOB WORK INDEX:", PRODUCTION_COLUMNS.JOB_WORK);

  console.log("JOB WORK RAW VALUE:", row[PRODUCTION_COLUMNS.JOB_WORK]);

  console.log("JOB WORK START:", row[PRODUCTION_COLUMNS.JOB_WORK_START]);

  console.log("JOB WORK END:", row[PRODUCTION_COLUMNS.JOB_WORK_END]);

  console.log("IS JOB WORK:", isJobWorkOrder(row));

  console.log("FULL ROW:", row);

  console.log("====================================");
  validatePreviousProcess(
    row,

    process,
  );

  // ==========================================
  // CURRENT STATUS
  // ==========================================

  const currentStatus = getProcessStatus(
    row,

    process,
  );

  if (currentStatus === "Completed") {
    throw new Error(`${process} is already completed`);
  }

  if (currentStatus === "In Progress") {
    throw new Error(`${process} is already in progress`);
  }

  const now = new Date().toLocaleString();

  // ==========================================
  // START TIME
  // ==========================================

  await updateCell(
    `${processMap.time}${rowNumber}`,

    now,
  );

  // ==========================================
  // UPDATED BY
  // ==========================================

  await updateCell(
    `AG${rowNumber}`,

    updatedBy || "",
  );

  // ==========================================
  // UPDATED TIME
  // ==========================================

  await updateCell(
    `AH${rowNumber}`,

    now,
  );

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
}) => {
  const rows = await getProductionOrders();

  const {
    rowNumber,

    row,
  } = findProductionOrder(
    rows,

    soNo,

    product,
  );

  const processMap = PROCESS_MAP[process];

  if (!processMap) {
    throw new Error(`Invalid process: ${process}`);
  }

  // ==========================================
  // PREVIOUS PROCESS VALIDATION
  // ==========================================

  validatePreviousProcess(
    row,

    process,
  );

  // ==========================================
  // CURRENT PROCESS STATUS
  // ==========================================

  const currentStatus = getProcessStatus(
    row,

    process,
  );

  if (currentStatus === "Pending") {
    throw new Error("Process must be started first");
  }

  if (currentStatus === "Completed") {
    throw new Error(`${process} is already completed`);
  }

  // ==========================================
  // FIRST PROCESS
  // ==========================================

  const firstProcess = getFirstProcess(row);

  // ==========================================
  // PRODUCTION QTY
  // ==========================================

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

    await updateCell(
      `E${rowNumber}`,

      qty,
    );
  }

  const now = new Date().toLocaleString();

  // ==========================================
  // END TIME
  // ==========================================

  await updateCell(
    `${processMap.endTime}${rowNumber}`,

    now,
  );

  // ==========================================
  // PROCESS STATUS
  // ==========================================

  if (processMap.status) {
    await updateCell(
      `${processMap.status}${rowNumber}`,

      "Completed",
    );
  }

  // ==========================================
  // UPDATED BY
  // ==========================================

  await updateCell(
    `AG${rowNumber}`,

    updatedBy || "",
  );

  // ==========================================
  // UPDATED TIME
  // ==========================================

  await updateCell(
    `AH${rowNumber}`,

    now,
  );

  // ==========================================
  // PACKING COMPLETED
  // ==========================================

  if (process === "packing") {
    await updateCell(
      `AD${rowNumber}`,

      "Ready To Dispatch",
    );
  }

  return true;
};

// =====================================================
// GET PRODUCTION BY PROCESS
// =====================================================

export const getProductionByProcess = async (process) => {
  const rows = await getProductionOrders();

  const data = rows.slice(1);

  const currentProcess = PROCESS_MAP[process];

  if (!currentProcess) {
    throw new Error(`Invalid process: ${process}`);
  }

  const list = data.filter((row) => {
    // ==========================================
    // CANCELLED ORDER
    // ==========================================

    if (
      String(row[PRODUCTION_COLUMNS.STATUS] || "").toLowerCase() === "cancelled"
    ) {
      return false;
    }

    // ==========================================
    // JOB WORK
    // ==========================================

    if (process === "jobWork") {
      return (
        isJobWorkOrder(row) &&
        getProcessStatus(
          row,

          "jobWork",
        ) !== "Completed"
      );
    }

    // ==========================================
    // WARPING
    // ==========================================

    if (process === "warping") {
      // Already completed
      if (
        getProcessStatus(
          row,

          "warping",
        ) === "Completed"
      ) {
        return false;
      }

      // Job Work order:
      // Job Work must be completed first

      if (isJobWorkOrder(row)) {
        return (
          getProcessStatus(
            row,

            "jobWork",
          ) === "Completed"
        );
      }

      // Normal order
      return true;
    }

    // ==========================================
    // OTHER PROCESSES
    // ==========================================

    if (
      getProcessStatus(
        row,

        process,
      ) === "Completed"
    ) {
      return false;
    }

    const previousProcess = currentProcess.previous;

    if (!previousProcess) {
      return true;
    }

    return (
      getProcessStatus(
        row,

        previousProcess,
      ) === "Completed"
    );
  });

  return list.map((row) => ({
    id: `${row[PRODUCTION_COLUMNS.SO_NO]}-${row[PRODUCTION_COLUMNS.PRODUCT]}`,

    soNo: row[PRODUCTION_COLUMNS.SO_NO] || "",

    product: row[PRODUCTION_COLUMNS.PRODUCT] || "",

    productionTargetQty: Number(row[PRODUCTION_COLUMNS.TARGET_QTY]) || 0,

    division: row[PRODUCTION_COLUMNS.DIVISION] || "",

    productionQty: Number(row[PRODUCTION_COLUMNS.PRODUCTION_QTY]) || 0,

    isJobWork: isJobWorkOrder(row),

    processStartTime:
      process === "jobWork"
        ? row[PRODUCTION_COLUMNS.JOB_WORK_START] || ""
        : row[currentProcess.timeIndex] || "",

    processEndTime:
      process === "jobWork"
        ? row[PRODUCTION_COLUMNS.JOB_WORK_END] || ""
        : row[currentProcess.endTimeIndex] || "",

    processStatus: getProcessStatus(
      row,

      process,
    ),
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
}) => {
  const rows = await getProductionOrders();

  const {
    rowNumber,

    row,
  } = findProductionOrder(
    rows,

    soNo,

    product,
  );

  const productionQty = Number(row[PRODUCTION_COLUMNS.PRODUCTION_QTY]) || 0;

  const wastage = Number(wastageQty);

  if (Number.isNaN(wastage) || wastage < 0) {
    throw new Error("Wastage quantity cannot be negative");
  }

  if (wastage > productionQty) {
    throw new Error("Wastage cannot be greater than Production Qty");
  }

  const nettQtyRTD = productionQty - wastage;

  const now = new Date().toLocaleString();

  await updateCell(
    `AE${rowNumber}`,

    wastage,
  );

  await updateCell(
    `AF${rowNumber}`,

    nettQtyRTD,
  );

  await updateCell(
    `AG${rowNumber}`,

    updatedBy || "",
  );

  await updateCell(
    `AH${rowNumber}`,

    now,
  );

  return true;
};
