import { auth, getDatabaseByDivision } from "../config/db.js";
import sheets from "../config/db.js";
import { DISPATCH_COLUMNS } from "../constants/dispatch.js";
import { SALES_COLUMNS ,SALES_COLUMN_LETTERS} from "../constants/salesColumns.js";
import { SHEET_NAMES,SHEETS_FROM_ENV_ID } from "../constants/sheetNames.js";

const salesOrderSpreadsheetId = process.env.GOOGLE_SHEET_ID;

const WOVEN_SHEET_ID = process.env.WOVEN_DATABASE_ID;



export const ALLOWED_DIVISIONS = ["woven", "crochet"];

// get all sales order
export const getSalesOrders = async () => {
  const authClient = await auth.getClient();

  const response = await sheets.spreadsheets.values.get({
    auth: authClient,

    spreadsheetId: salesOrderSpreadsheetId,

    range: `${SHEET_NAMES.SALES_MASTER}!A:W`,
  });

  return response.data.values || [];
};

// append sales order
export const appendMultipleSalesOrders = async (values) => {
  const authClient = await auth.getClient();

  await sheets.spreadsheets.values.append({
    auth: authClient,

    spreadsheetId: salesOrderSpreadsheetId,

    range: `${SHEET_NAMES.SALES_MASTER}!A:W`,

    valueInputOption: "USER_ENTERED",

    insertDataOption: "INSERT_ROWS",

    requestBody: {
      values,
    },
  });
};

// append sales order to production process according to division
export const appendSalesOrderToProductionProcess = async (values, division) => {
  console.log("Appending sales order to production process for division:", values, division);
  if (!division) {
    throw new Error("Division is required");
  }

  const spreadsheetId = getDatabaseByDivision(division);

  if (!spreadsheetId) {
    throw new Error(`No database configured for division: ${division}`);
  }

  const authClient = await auth.getClient();

  await sheets.spreadsheets.values.append({
    auth: authClient,

    spreadsheetId: spreadsheetId,

    range: `${SHEET_NAMES.PRODUCTION_SHEET}!A:I`,

    valueInputOption: "USER_ENTERED",

    insertDataOption: "INSERT_ROWS",

    requestBody: {
      values,
    },
  });
};

// cancel sales order

export const cancelSalesOrder = async (soNo) => {
  const authClient = await auth.getClient();

  const response = await sheets.spreadsheets.values.get({
    auth: authClient,

    spreadsheetId: salesOrderSpreadsheetId,

    range: `${SHEET_NAMES.SALES_MASTER}!A:W`,
  });

  const rows = response.data.values || [];

  const index = rows.findIndex((row, i) => i > 0 && row[SALES_COLUMNS.SO_NO] === soNo);

  if (index === -1) {
    throw new Error("Sales Order Not Found");
  }

  const rowNumber = index + 1;

  

  await sheets.spreadsheets.values.update({
    auth: authClient,

    spreadsheetId: salesOrderSpreadsheetId,

    range: `${SHEET_NAMES.SALES_MASTER}!${SALES_COLUMN_LETTERS.OVERALL_STATUS}${rowNumber}`,

    valueInputOption: "USER_ENTERED",

    requestBody: {
      values: [["Cancelled"]],
    },
  });

  return true;
};

// ==========================================
// UPDATE MANUFACTURED QTY
// ==========================================
export const updateManufacturedQty = async ({
  soNo,
  product,
  manufacturedQty,
}) => {
  const authClient = await auth.getClient();

  const rows = await getSalesOrders();

  const rowIndex = rows.findIndex(
    (row) =>
      String(row[SALES_COLUMNS.SO_NO]).trim() === String(soNo || "").trim() &&
      String(row[SALES_COLUMNS.PRODUCT]).trim() === String(product || "").trim(),
  );

  if (rowIndex === -1) {
    throw new Error("Sales Order not found");
  }

  // actual row 
  const row = rows[rowIndex]
  const oldManufacturedQty = Number(row[SALES_COLUMNS.MANUFACTURED_QTY]) || 0;

  const qtyToAdd = Number(manufacturedQty);
    
  if(!Number.isFinite(qtyToAdd) || qtyToAdd <=0){
    throw new Error("Invalid manufactured quantity");
  }

  const newManufacturedQty = oldManufacturedQty + qtyToAdd;

  await sheets.spreadsheets.values.update({
    auth: authClient,
    spreadsheetId: salesOrderSpreadsheetId,
    range: `${SHEET_NAMES.SALES_MASTER}!${SALES_COLUMN_LETTERS.MANUFACTURED_QTY}${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newManufacturedQty]],
    },
  });

  return true;
};

// ==========================================
// UPDATE DISPATCHED QTY
// ==========================================
export const updateDispatchedQty = async ({ soNo, product, dispatchedQty }) => {
  const authClient = await auth.getClient();

  const rows = await getSalesOrders();

  const rowIndex = rows.findIndex(
    (row) =>
      String(row[SALES_COLUMNS.SO_NO]).trim() === String(soNo || "").trim() &&
      String(row[SALES_COLUMNS.PRODUCT]).trim() === String(product || "").trim(),
  );

  if (rowIndex === -1) {
    throw new Error("Sales Order not found");
  }


  const row = rows[rowIndex];

  const oldDispatchedQty = row[DISPATCH_COLUMNS.DISPATCH_QTY]

  const qtyToAdd = Number(dispatchedQty);

  if(!Number.isFinite(qtyToAdd) || qtyToAdd <=0){
    throw new Error("Invalid dispatched quantity");
  }

  const newDispatchedQty = oldDispatchedQty + qtyToAdd

  await sheets.spreadsheets.values.update({
    auth: authClient,
    spreadsheetId: salesOrderSpreadsheetId,
    range: `${SHEET_NAMES.SALES_MASTER}!${SALES_COLUMN_LETTERS.DISPATCHED_QTY}${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newDispatchedQty]],
    },
  });

  return true;
};

// ==========================================
// UPDATE OVERALL STATUS
// ==========================================
export const updateOverallStatus = async ({ soNo, product }) => {
  const authClient = await auth.getClient();

  const rows = await getSalesOrders();

  const rowIndex = rows.findIndex(
    (row) =>
      row[SALES_COLUMNS.SO_NO] === soNo &&
      row[SALES_COLUMNS.PRODUCT] === product,
  );

  if (rowIndex === -1) {
    throw new Error("Sales Order not found");
  }

  const soQty = Number(rows[rowIndex][SALES_COLUMNS.SO_QTY]) || 0;
  const manufacturedQty =
    Number(rows[rowIndex][SALES_COLUMNS.MANUFACTURED_QTY]) || 0;
  const dispatchedQty =
    Number(rows[rowIndex][SALES_COLUMNS.DISPATCHED_QTY]) || 0;

  let status = "Pending";

  if (manufacturedQty > 0) {
    status = "In Production";
  }

  if (manufacturedQty >= soQty && soQty > 0) {
    status = "Ready To Dispatch";
  }

  if (dispatchedQty > 0 && dispatchedQty < manufacturedQty) {
    status = "Partially Dispatched";
  }

  if (manufacturedQty > 0 && dispatchedQty >= manufacturedQty) {
    status = "Completed";
  }

  await sheets.spreadsheets.values.update({
    auth: authClient,
    spreadsheetId: salesOrderSpreadsheetId,
    range: `${SHEET_NAMES.SALES_MASTER}!${SALES_COLUMN_LETTERS.OVERALL_STATUS}${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[status]],
    },
  });

  return status;
};

// get last sales order no for generate so number
export const getLastSalesOrderNumber = async () => {
  const authClient = await auth.getClient();
  const response = await sheets.spreadsheets.values.get({
    auth: authClient,
    spreadsheetId:`${salesOrderSpreadsheetId}`,
    range: `${SHEET_NAMES.SALES_MASTER}!A:A`,
  });

  const rows = response.data.values || [];

  if (rows.length <= 1) {
    return "ANF00001";
  }

  const lastSo = rows[rows.length - 1][0];

  const number =
    parseInt(String(lastSo).replace("ANF", ""), 10) || 0;

  return `ANF${String(number + 1).padStart(5, "0")}`;
}