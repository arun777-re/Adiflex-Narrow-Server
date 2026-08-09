import sheets from "../config/db.js";
import { DISPATCH_COLUMNS, DISPATCH_SHEET_COLUMNS } from "../constants/dispatch.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { updateDispatchedQty, updateOverallStatus } from "./salesOrderSheet.js";

// function to append data to dispatch sheet

export const appendDispatch = async ({ values }) => {
  if (!values) {
    throw new Error("Value is required field");
  }

  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,

    range: `${SHEET_NAMES.DISPATCH_SHEET}!A:P`,

    valueInputOption: "USER_ENTERED",

    insertDataOption: "INSERT_ROWS",

    requestBody: {
      values: [values],
    },
  });
};

// =====================================================
// GET ALL DISPATCH ORDERS
// =====================================================

export const getAllDispatchOrders = async () => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!A2:P`,
  });

  const rows = response.data.values || [];

  return rows.map((row, index) => ({
    id: `${row[DISPATCH_COLUMNS.SO_NO]}-${row[DISPATCH_COLUMNS.SKU_CODE]}`,

    rowNumber: index + 2,

    soNo: row[DISPATCH_COLUMNS.SO_NO] || "",
    cycleID: row[DISPATCH_COLUMNS.CYCLE_ID] || "",

    skuCode: row[DISPATCH_COLUMNS.SKU_CODE] || "",

    product: row[DISPATCH_COLUMNS.PRODUCT] || "",

    division: row[DISPATCH_COLUMNS.DIVISION] || "",

    productionQty: Number(
      row[DISPATCH_COLUMNS.PRODUCTION_QTY] || 0
    ),

    rate: Number(row[DISPATCH_COLUMNS.RATE] || 0),

    shippinglocation:
      row[DISPATCH_COLUMNS.SHIPPING_LOCATION] || "",

    billinglocation:
      row[DISPATCH_COLUMNS.BILLING_LOCATION] || "",

    freight:
      row[DISPATCH_COLUMNS.FREIGHT] || false,

    wastageQty: Number(
      row[DISPATCH_COLUMNS.WASTAGE_QTY] || 0
    ),

    dispatchQty: Number(
      row[DISPATCH_COLUMNS.DISPATCH_QTY] || 0
    ),

    availableQty: Number(
      row[DISPATCH_COLUMNS.AVAILABLE_QTY] || 0
    ),

    status: row[DISPATCH_COLUMNS.STATUS] || "",

    createdAt:
      row[DISPATCH_COLUMNS.CREATED_AT] || "",

    updatedAt:
      row[DISPATCH_COLUMNS.UPDATED_AT] || "",
  }));
};

// =====================================================
// DISPATCH ORDER
// =====================================================

export const dispatchOrder = async ({
  soNo,
  cycleID,
  product,
  dispatchQty,
}) => {
  console.log("Dispatch Order:", { soNo, product, dispatchQty });
  if (!soNo) {
    throw new Error("SO No is required");
  }

  if (!product) {
    throw new Error("Product is required");
  }

  const qty = Number(dispatchQty);

  if (Number.isNaN(qty) || qty <= 0) {
    throw new Error("Dispatch Qty must be greater than 0");
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!A2:P`,
  });

  const rows = response.data.values || [];

  const index = rows.findIndex(
    (row) =>
      String(row[DISPATCH_COLUMNS.SO_NO]).trim() === String(soNo).trim() &&
      String(row[DISPATCH_COLUMNS.PRODUCT]).trim() === String(product).trim() && 
      String(row[DISPATCH_COLUMNS.CYCLE_ID]).trim() === String(cycleID).trim()
  );
  console.log("Before:", rows[index]);

  if (index === -1) {
    throw new Error("Dispatch order not found");
  }

  const rowNumber = index + 2;

  const manufacturedQty = Number(
    rows[index][DISPATCH_COLUMNS.AVAILABLE_QTY] || 0
  );

  const oldDispatchQty = Number(
    rows[index][DISPATCH_COLUMNS.DISPATCH_QTY] || 0
  );

  const availableQty = Number(
    rows[index][DISPATCH_COLUMNS.AVAILABLE_QTY] ||
      (manufacturedQty - oldDispatchQty)
  );

  if (qty > availableQty) {
    throw new Error(
      `Dispatch Qty cannot be greater than Available Qty (${availableQty})`
    );
  }

  const newDispatchQty = oldDispatchQty + qty;

  const newAvailableQty = availableQty - newDispatchQty;

  let status = "Ready To Dispatch";

  if (newAvailableQty === 0) {
    status = "Fully Dispatched";
  } else if (newDispatchQty > 0) {
    status = "Partially Dispatched";
  }

  const now = new Date().toLocaleString();

  // Dispatch Qty (Column L)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!L${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newDispatchQty]],
    },
  });

  // Available Qty (Column M)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!${DISPATCH_SHEET_COLUMNS.AVAILABLE_QTY}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newAvailableQty]],
    },
  });

  // Status (Column N)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!${DISPATCH_SHEET_COLUMNS.STATUS}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[status]],
    },
  });

  // Updated At (Column P)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!${DISPATCH_SHEET_COLUMNS.UPDATED_AT}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[now]],
    },
  });
  // Update Sales Order
  await updateDispatchedQty({
    soNo,
    product,
    dispatchedQty: newDispatchQty,
  });

  // Update Overall Status
  await updateOverallStatus({
    soNo,
    product,
  });

  return {
    soNo,
    product,
    dispatchQty: newDispatchQty,
    availableQty: newAvailableQty,
    status,
  };
};
