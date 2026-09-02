import sheets, { getCurrentDateTime, getDatabaseByDivision, updateCell } from "../config/db.js";

import { PROCESS_MAP, PRODUCTION_COLUMNS,PRODUCTION_SHEET_COLUMNS } from "../constants/processMap.js";
import {
  createNextProductionCycle,
  handleFinishedGoods,
} from "../helpers/productionHelpers.js";
import { handleInternalFG } from "./fgSheets.js";
import { updateManufacturedQty } from "./salesOrderSheet.js";
import { sendNotification } from "../helpers/notificationHelper.js";

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

    range: "Production_Process!A1:AG",
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

const findProductionOrder = (rows, soNo, product,cycleID) => {
  console.log("hsjdfhjskfh......",cycleID)
  const index = rows.findIndex(
    (row) =>
      row[PRODUCTION_COLUMNS.SO_NO] === soNo &&
      row[PRODUCTION_COLUMNS.PRODUCT] === product &&
      row[PRODUCTION_COLUMNS.CYCLE_ID] === cycleID,
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
  cycleID,
  product,
  process,
  updatedBy,
  division,
}) => {

  const rows = await getProductionOrders(division);

  const { rowNumber, row } = findProductionOrder(rows, soNo, product,cycleID);
  console.log("rows.........",rows,"row",row,"rowNumber",rowNumber);

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

  const now = getCurrentDateTime();

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
  cycleID,
  product,
  process,
  productionQty,
  updatedBy,
  division,
}) => {
  const TOTAL_TIMER = `🔥 TOTAL completeProductionProcess | ${soNo} | ${cycleID} | ${process}`;

  console.time(TOTAL_TIMER);

  try {
    // =========================================================
    // 1. GET PRODUCTION ORDER
    // =========================================================

    console.time("⏱️ 1. getProductionOrders");

    const rows = await getProductionOrders(division);

    console.timeEnd("⏱️ 1. getProductionOrders");
    // =========================================================
    // 2. FIND PRODUCTION ORDER
    // =========================================================

    console.time("⏱️ 2. findProductionOrder");

    const { rowNumber, row } = findProductionOrder(
      rows,
      soNo,
      product,
      cycleID
    );

    console.timeEnd("⏱️ 2. findProductionOrder");

    if (!row || !rowNumber) {
      throw new Error("Production order not found");
    }


    // =========================================================
    // 3. PROCESS CONFIG
    // =========================================================

    console.time("⏱️ 3. processConfig");

    const processMap = PROCESS_MAP[process];

    if (!processMap) {
      throw new Error(`Invalid process: ${process}`);
    }

    console.timeEnd("⏱️ 3. processConfig");


    // =========================================================
    // 4. VALIDATE PREVIOUS PROCESS
    // =========================================================

    console.time("⏱️ 4. validatePreviousProcess");

    validatePreviousProcess(row, process);

    console.timeEnd("⏱️ 4. validatePreviousProcess");


    // =========================================================
    // 5. CURRENT PROCESS STATUS
    // =========================================================

    console.time("⏱️ 5. getProcessStatus");

    const currentStatus = getProcessStatus(row, process);

    console.timeEnd("⏱️ 5. getProcessStatus");

    if (currentStatus === "Pending") {
      throw new Error("Process must be started first");
    }

    if (currentStatus === "Completed") {
      throw new Error(`${process} is already completed`);
    }
    // =========================================================
    // 6. FIRST PROCESS
    // =========================================================
    const firstProcess = getFirstProcess(row);

    const now = getCurrentDateTime();

    console.log("🔥 Process:", process);
    console.log("🔥 First Process:", firstProcess);
    console.log("🔥 Row Number:", rowNumber);
    // =========================================================
    // 7. FIRST PROCESS COMPLETION
    // =========================================================

    if (process === firstProcess) {

      console.log("🚀 FIRST PROCESS COMPLETION FLOW");

      const targetQty = Number(
        row[PRODUCTION_COLUMNS.TARGET_QTY]
      );


      // =======================================================
      // VALIDATE PRODUCTION QTY
      // =======================================================

      console.time("⏱️ 7. validateProductionQty");

      if (
        productionQty === undefined ||
        productionQty === null ||
        productionQty === ""
      ) {
        throw new Error("Production Qty is required");
      }

      const qty = Number(productionQty);

      if (Number.isNaN(qty) || qty <= 0) {
        throw new Error(
          "Production Qty must be greater than 0"
        );
      }

      if (qty > targetQty) {
        throw new Error(
          "Production Qty cannot exceed Target Qty"
        );
      }

      const remainingQty = targetQty - qty;

      console.timeEnd("⏱️ 7. validateProductionQty");


      // =======================================================
      // UPDATE PRODUCTION QTY
      // =======================================================

      console.time("⏱️ 8. updateProductionQty");

      await updateCell({
        division,
        range: `${PRODUCTION_SHEET_COLUMNS.PRODUCTION_QTY}${rowNumber}`,
        value: qty,
      });

      console.timeEnd("⏱️ 8. updateProductionQty");


      // =======================================================
      // COMPLETE CURRENT PROCESS
      // =======================================================

      console.time("⏱️ 9. completeCurrentProcess");

      await updateCell({
        division,
        range: `${processMap.endTime}${rowNumber}`,
        value: now,
      });

      if (processMap.status) {
        await updateCell({
          division,
          range: `${processMap.status}${rowNumber}`,
          value: "Completed",
        });
      }

      console.timeEnd("⏱️ 9. completeCurrentProcess");


      // =======================================================
      // UPDATED BY
      // =======================================================

      console.time("⏱️ 10. updateUpdatedBy");

      await updateCell({
        division,
        range: `${PRODUCTION_SHEET_COLUMNS.UPDATED_BY}${rowNumber}`,
        value: updatedBy || "",
      });

      console.timeEnd("⏱️ 10. updateUpdatedBy");


      // =======================================================
      // UPDATED TIME
      // =======================================================

      console.time("⏱️ 11. updateUpdatedTime");

      await updateCell({
        division,
        range: `${PRODUCTION_SHEET_COLUMNS.UPDATED_TIME}${rowNumber}`,
        value: now,
      });

      console.timeEnd("⏱️ 11. updateUpdatedTime");
      // =======================================================
      // CREATE NEXT CYCLE
      // =======================================================

      if (remainingQty > 0) {

        console.log(
          `🔥 Remaining Qty: ${remainingQty}`
        );

        const skucode =
          row[PRODUCTION_COLUMNS.SKU_CODE];


        // -------------------------------------------------------
        // CURRENT CYCLE STATUS
        // -------------------------------------------------------

        console.time("⏱️ 12. updateCurrentCycleStatus");

        await updateCell({
          division,
          range: `${PRODUCTION_SHEET_COLUMNS.STATUS}${rowNumber}`,
          value: "Pending",
        });

        console.timeEnd("⏱️ 12. updateCurrentCycleStatus");


        // -------------------------------------------------------
        // CREATE NEXT CYCLE
        // -------------------------------------------------------

        console.time("⏱️ 13. createNextProductionCycle");

        await createNextProductionCycle({
          division,
          skucode,
          currentRow: row,
          remainingQty,
        });

        console.timeEnd("⏱️ 13. createNextProductionCycle");


        console.log(
          `🔥 Next cycle created | ${soNo} | Remaining: ${remainingQty}`
        );

      } else {

        console.time("⏱️ 12. completeFinalCycle");

        await updateCell({
          division,
          range: `${PRODUCTION_SHEET_COLUMNS.STATUS}${rowNumber}`,
          value: "Pending",
        });

        console.timeEnd("⏱️ 12. completeFinalCycle");
      }


      console.timeEnd(TOTAL_TIMER);

      return true;
    }


    // =========================================================
    // 8. OTHER PROCESSES
    // =========================================================

    console.log("🚀 OTHER PROCESS FLOW:", process);


    // =========================================================
    // COMPLETE PROCESS
    // =========================================================

    console.time("⏱️ 14. completeProcess");

    await updateCell({
      division,
      range: `${processMap.endTime}${rowNumber}`,
      value: now,
    });

    if (processMap.status) {
      await updateCell({
        division,
        range: `${processMap.status}${rowNumber}`,
        value: "Completed",
      });
    }

    console.timeEnd("⏱️ 14. completeProcess");


    // =========================================================
    // UPDATED BY
    // =========================================================

    console.time("⏱️ 15. updateUpdatedBy");

    await updateCell({
      division,
      range: `${PRODUCTION_SHEET_COLUMNS.UPDATED_BY}${rowNumber}`,
      value: updatedBy || "",
    });

    console.timeEnd("⏱️ 15. updateUpdatedBy");


    // =========================================================
    // UPDATED TIME
    // =========================================================

    console.time("⏱️ 16. updateUpdatedTime");

    await updateCell({
      division,
      range: `${PRODUCTION_SHEET_COLUMNS.UPDATED_TIME}${rowNumber}`,
      value: now,
    });

    console.timeEnd("⏱️ 16. updateUpdatedTime");


    // =========================================================
    // PACKING COMPLETION
    // =========================================================

    if (process === "packing") {

      console.log("🚀 PACKING COMPLETION FLOW");

      console.time("⏱️ 17. packingCalculations");

      const manufacturedQty = Number(
        row[PRODUCTION_COLUMNS.PRODUCTION_QTY] || 0
      );

      const wastageQty = Number(
        row[PRODUCTION_COLUMNS.WASTAGE_QTY] || 0
      );

      const targetQty = Number(
        row[PRODUCTION_COLUMNS.TARGET_QTY]
      );

      if (manufacturedQty > targetQty) {
        throw new Error(
          "Production Qty cannot exceed Target Qty"
        );
      }

      console.timeEnd("⏱️ 17. packingCalculations");


      // =======================================================
      // FINISHED GOODS
      // =======================================================

      console.time("⏱️ 18. handleFinishedGoods");

      await handleFinishedGoods({
        soNo,
        cycleID,
        product,
        division,
        manufacturedQty,
        wastageQty,
        updatedBy,
      });

      console.timeEnd("⏱️ 18. handleFinishedGoods");


      // =======================================================
      // PACKING STATUS
      // =======================================================

      console.time("⏱️ 19. packingStatus");

      await updateCell({
        division,
        range: `${PRODUCTION_SHEET_COLUMNS.STATUS}${rowNumber}`,
        value: "Completed",
      });

      console.timeEnd("⏱️ 19. packingStatus");


      // =======================================================
      // DISPATCH NOTIFICATION
      // =======================================================

      console.time("⏱️ 20. dispatchNotification");

      sendNotification({
        role: "dispatch",
        division,
        type: "dispatch-ready",
        title: "New Sales Order Ready for Dispatch",
        message: `A new sales order: ${soNo} is ready for dispatch`,
        reference: soNo,
      })
        .then(() => {
          console.log(
            "🔥 Notification sent to dispatch team"
          );
        })
        .catch((error) => {
          console.error(
            "❌ Error sending dispatch notification:",
            error
          );
        });

      console.timeEnd("⏱️ 20. dispatchNotification");
    }


    // =========================================================
    // TOTAL
    // =========================================================

    console.timeEnd(TOTAL_TIMER);

    return true;

  } catch (error) {

    console.error(
      "❌ completeProductionProcess error:",
      error
    );

    console.timeEnd(TOTAL_TIMER);

    throw error;
  }
};



// =====================================================
// COMPLETE QUALITY + WASTAGE
// =====================================================

export const completeQualityWithWastage = async ({
  soNo,
  cycleID,

  product,

  wastageQty,

  updatedBy,

  division,
}) => {
  const rows = await getProductionOrders(division);

  const { rowNumber, row } = findProductionOrder(rows, soNo, product, cycleID);

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


  const now = new Date().toLocaleString();

  // QUALITY END
  await updateCell({
    division,

    range: `${PRODUCTION_SHEET_COLUMNS.QUALITY_END}${rowNumber}`,

    value: now,
  });

  // QUALITY STATUS
  await updateCell({
    division,

    range: `${PRODUCTION_SHEET_COLUMNS.QUALITY_STATUS}${rowNumber}`,

    value: "Completed",
  });

  // WASTAGE
  await updateCell({
    division,

    range: `${PRODUCTION_SHEET_COLUMNS.WASTAGE_QTY}${rowNumber}`,

    value: wastage,
  });


  // update manufactured qty in sales_order sheet
  await updateManufacturedQty({
    soNo: soNo,
    product: product,
    manufacturedQty:productionQty,
  });

  // UPDATED BY
  await updateCell({
    division,

    range: `${PRODUCTION_SHEET_COLUMNS.UPDATED_BY}${rowNumber}`,

    value: updatedBy || "",
  });

  // UPDATED TIME
  await updateCell({
    division,

    range: `${PRODUCTION_SHEET_COLUMNS.UPDATED_TIME}${rowNumber}`,

    value: now,
  });

  return {
    wastageQty: wastage,
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
