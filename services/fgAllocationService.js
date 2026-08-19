// services/fgAllocationService.js

import sheets from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { FG_COLUMNS } from "../constants/fg.js";
import { ALLOCATION_COLUMNS } from "../constants/allocation.js";

// =====================================================
// RESERVE FG STOCK + CREATE ALLOCATION
// =====================================================

export const reserveFGStock = async ({
  soNo,
  skuCode,
  product,
  qty,
  unit,
  division,
  customer,
  cycleID = "",
}) => {
  if (!soNo) throw new Error("SO No is required");
  if (!skuCode) throw new Error("SKU Code is required");

  const soQty = Number(qty);

  if (Number.isNaN(soQty) || soQty <= 0) {
    throw new Error("SO Qty must be greater than 0");
  }

  // =====================================================
  // 1. GET FG STOCK
  // =====================================================

  const fgResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.FG_SHEET}!A2:J`,
  });

  const rows = fgResponse.data.values || [];

  const index = rows.findIndex(
    (row) =>
      String(row[FG_COLUMNS.SKU] || "")
        .trim()
        .toLowerCase() ===
      String(skuCode).trim().toLowerCase()
  );

  // =====================================================
  // 2. SKU NOT FOUND
  // =====================================================

  if (index === -1) {
    return {
      success: true,
      soNo,
      skuCode,
      soQty,

      availableBefore: 0,

      fgAllocatedQty: 0,
      productionRequiredQty: soQty,

      availableAfter: 0,

      allocationStatus: "Production Required",
    };
  }

  const rowNumber = index + 2;
  const row = rows[index];

  // =====================================================
  // 3. CURRENT STOCK
  // =====================================================

  const availableQty =
    Number(row[FG_COLUMNS.AVAILABLE_QTY]) || 0;

  const reservedQty =
    Number(row[FG_COLUMNS.RESERVED_QTY]) || 0;

  // =====================================================
  // 4. CALCULATE ALLOCATION
  // =====================================================

  // Jitna available hai utna FG reserve hoga
  const fgAllocatedQty = Math.min(
    soQty,
    availableQty
  );

  // Baaki production mein jayega
  const productionRequiredQty = Math.max(
    soQty - fgAllocatedQty,
    0
  );

  // =====================================================
  // 5. NEW STOCK
  // =====================================================

  const newAvailableQty =
    availableQty - fgAllocatedQty;

  const newReservedQty =
    reservedQty + fgAllocatedQty;

  // =====================================================
  // 6. UPDATE FG STOCK
  // =====================================================

  if (fgAllocatedQty > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,

      requestBody: {
        valueInputOption: "USER_ENTERED",

        data: [
          {
            range: `${SHEET_NAMES.FG_SHEET}!E${rowNumber}`,
            values: [[newAvailableQty]],
          },
          {
            range: `${SHEET_NAMES.FG_SHEET}!F${rowNumber}`,
            values: [[newReservedQty]],
          },
        ],
      },
    });
  }

  // =====================================================
  // 7. ALLOCATION STATUS
  // =====================================================

  let allocationStatus = "Production Required";

  if (fgAllocatedQty === soQty) {
    allocationStatus = "Fully Reserved";
  } else if (fgAllocatedQty > 0) {
    allocationStatus = "Partially Reserved";
  }

  // =====================================================
  // 8. CREATE ALLOCATION ENTRY
  // =====================================================

  const now = new Date().toLocaleString();

  const allocationValues = [
    soNo,
    skuCode,
    product || row[FG_COLUMNS.PRODUCT_NAME] || "",
    division || row[FG_COLUMNS.DIVISION] || "",
    unit || row[FG_COLUMNS.UNIT] || "",
    customer || "",

    // SO Qty
    soQty,

    // FG Reserved
    fgAllocatedQty,

    // Production Required
    productionRequiredQty,

    cycleID || "",

    allocationStatus,

    now,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,

    range: `${SHEET_NAMES.ALLOCATION_SHEET}!A:L`,

    valueInputOption: "USER_ENTERED",

    insertDataOption: "INSERT_ROWS",

    requestBody: {
      values: [allocationValues],
    },
  });

  // =====================================================
  // 9. RETURN
  // =====================================================

  return {
    success: true,

    soNo,
    skuCode,

    soQty,

    availableBefore: availableQty,

    fgAllocatedQty,
    productionRequiredQty,

    availableAfter: newAvailableQty,

    totalReservedQty: newReservedQty,

    allocationStatus,
  };
};

// =====================================================
// RELEASE RESERVED FG + MARK ALLOCATION AS DISPATCHED
// =====================================================

export const consumeReservedFGStock = async ({
  skuCode,
  dispatchQty,
}) => {
  const qty = Number(dispatchQty);

  if (!skuCode) throw new Error("SKU Code is required");
  if (!qty || qty <= 0) {
    throw new Error("Dispatch Qty must be greater than 0");
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.FG_SHEET}!A2:J`,
  });

  const rows = response.data.values || [];

  const index = rows.findIndex(
    row =>
      String(row[FG_COLUMNS.SKU] || "").trim().toLowerCase() ===
      String(skuCode).trim().toLowerCase()
  );

  if (index === -1) {
    throw new Error(`FG stock not found for SKU: ${skuCode}`);
  }

  const rowNumber = index + 2;

  const reservedQty =
    Number(rows[index][FG_COLUMNS.RESERVED_QTY]) || 0;

  const dispatchedQty =
    Number(rows[index][FG_COLUMNS.DISPATCHED_QTY]) || 0;

  if (qty > reservedQty) {
    throw new Error(
      `Reserved FG is insufficient. Reserved: ${reservedQty}, Dispatch: ${qty}`
    );
  }

  const newReservedQty = reservedQty - qty;
  const newDispatchedQty = dispatchedQty + qty;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `${SHEET_NAMES.FG_SHEET}!F${rowNumber}`,
          values: [[newReservedQty]],
        },
        {
          range: `${SHEET_NAMES.FG_SHEET}!G${rowNumber}`,
          values: [[newDispatchedQty]],
        },
      ],
    },
  });

  return {
    skuCode,
    dispatchedQty: qty,
    reservedQty: newReservedQty,
    dispatchedTotal: newDispatchedQty,
  };
};