import { getDatabaseByDivision, updateCell } from "../config/db.js";
import { appendDispatch } from "../services/dispatchSheet.js";
import { handleInternalFG } from "../services/fgSheets.js";
import sheets, { auth } from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

import { getSalesOrders } from "../services/salesOrderSheet.js";
import { getRateFromSalesOrder } from "./salesOrderHelpers.js";
import { PRODUCTION_COLUMNS } from "../constants/processMap.js";


// =====================================================
// PRODUCTION CYCLE HELPER
// =====================================================

export const generateNextCycleId = (
  soNo,
  skucode,
  currentCycleId = null
) => {
  if (!soNo) {
    throw new Error("SO No is required");
  }

  if (!skucode) {
    throw new Error("SKU Code is required");
  }

  // ==========================================
  // FIRST PRODUCTION CYCLE
  // ==========================================

  if (!currentCycleId) {
    return `${soNo}-${skucode}-C1`;
  }

  // ==========================================
  // NEXT PRODUCTION CYCLE
  // ==========================================

  const cycleMatch =
    String(currentCycleId).match(/-C(\d+)$/);

  if (!cycleMatch) {
    throw new Error(
      `Invalid Production Cycle ID: ${currentCycleId}`
    );
  }

  const currentCycleNumber =
    Number(cycleMatch[1]);

  const nextCycleNumber =
    currentCycleNumber + 1;

  return `${soNo}-${skucode}-C${nextCycleNumber}`;
};


const getOrderType = async (soNo, product) => {
  const rows = await getSalesOrders();

  const data = rows.slice(1);

  const order = data.find((row) => row[0] === soNo && row[4] === product);

  if (!order) {
    throw new Error("Sales Order not found");
  }

  return order[5];
};

export const handleFinishedGoods = async ({  
  soNo,
  cycleID,
  product,
  division,
  manufacturedQty,
  wastageQty,
  updatedBy,
}) => {

  console.log("manufactured qty", manufacturedQty, "wastage qty", wastageQty);

  const orderType = await getOrderType(soNo, product);
  const { rate, shippingLocation, billingLocation, freight, jobWork, skucode ,partyPO,route,customer} =
    await getRateFromSalesOrder({ soNo, product });
  console.log("handleFinishedGoods:", {
    shippingLocation,
    billingLocation,
    freight,
    jobWork,
    skucode,
  });
  const now = new Date().toLocaleString();
  // dispatch data 
  const dispatchRow = [
    soNo,
    skucode,
    cycleID,
    product,
    customer,
    "",
    "",
    partyPO,
    route,
    division,
    manufacturedQty,
    rate,
    shippingLocation,
    billingLocation,
    freight,
    0,
    wastageQty,
    0,
    manufacturedQty,
    "Ready To Dispatch",
    now,
    now,
  ];
  if (orderType === "Customer") {
    await appendDispatch({
      values: dispatchRow,
    });
  } else {
    await handleInternalFG({
      soNo,
      product,
      qty:manufacturedQty,
      updatedBy,
    });
  }

  return true;
};

export const createNextProductionCycle = async ({
  division,
  skucode,
  currentRow,
  remainingQty,
}) => {
  const authClient = await auth.getClient();

  // ==========================================
  // BASIC DATA
  // ==========================================

  const soNo =
    currentRow[PRODUCTION_COLUMNS.SO_NO];

  const currentCycleId =
    currentRow[PRODUCTION_COLUMNS.CYCLE_ID];

  // ==========================================
  // VALIDATION
  // ==========================================

  if (!soNo) {
    throw new Error("SO No is missing");
  }

  if (!currentCycleId) {
    throw new Error("Production Cycle ID is missing");
  }

  if (!remainingQty || Number(remainingQty) <= 0) {
    throw new Error("Remaining Qty must be greater than 0");
  }

  // ==========================================
  // NEXT CYCLE ID
  // ==========================================

  const nextCycleId = generateNextCycleId(
    soNo,
    skucode,
    currentCycleId
  );

  // ==========================================
  // NEW PRODUCTION ROW
  // ==========================================

  const values = [[

    // A - SO NO
    soNo,

    // B - CYCLE ID
    nextCycleId,

    // C - SKU CODE
    currentRow[PRODUCTION_COLUMNS.SKU_CODE],

    // D - PRODUCT
    currentRow[PRODUCTION_COLUMNS.PRODUCT],

    // E - ORDER TYPE
    currentRow[PRODUCTION_COLUMNS.ORDER_TYPE],

    // F - TARGET QTY
    Number(remainingQty),

    // G - DIVISION
    currentRow[PRODUCTION_COLUMNS.DIVISION],

    // H - PRODUCTION QTY
    "",

    // I - JOB WORK
    currentRow[PRODUCTION_COLUMNS.JOB_WORK],

    // J - JOB WORK START
    "",

    // K - JOB WORK END
    "",

    // L - WARPING START
    "",

    // M - WARPING
    "",

    // N - WARPING END
    "",

    // O - FILLING START
    "",

    // P - FILLING
    "",

    // Q - FILLING END
    "",

    // R - MACHINE START
    "",

    // S - MACHINE
    "",

    // T - MACHINE END
    "",

    // U - FINISHING START
    "",

    // V - FINISHING
    "",

    // W - FINISHING END
    "",

    // X - QUALITY START
    "",

    // Y - QUALITY
    "",

    // Z - QUALITY END
    "",

    // AA - WASTAGE QTY
    0,

    // AB - ROLLING START
    "",

    // AC - ROLLING
    "",

    // AD - ROLLING END
    "",

    // AE - PACKING START
    "",

    // AF - PACKING
    "",

    // AG - PACKING END
    "",

    // AH - STATUS
    "Pending",

    // AI - UPDATED BY
    "",

    // AJ - UPDATED TIME
    "",
  ]];

  // ==========================================
  // DATABASE
  // ==========================================

  const spreadSheetId =
    await getDatabaseByDivision(division);

  await sheets.spreadsheets.values.append({
    auth: authClient,
    spreadsheetId: spreadSheetId,

    // A:AJ = 36 columns
    range: `${SHEET_NAMES.PRODUCTION_SHEET}!A:AJ`,

    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",

    requestBody: {
      values,
    },
  });

  return true;
};
