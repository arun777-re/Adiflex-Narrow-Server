// ==========================================
// APPEND BILLING ORDER
// ==========================================

import sheets from "../config/db.js";
import { BILLING_COLUMNS } from "../constants/billingColumns.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

export const appendBillingOrder = async ({
  soNo,
  skuCode,
  cycleID,
  product,
  customer,
  partyPO,
  route,
  division,
  dispatchQty,
}) => {
  const now = new Date().toLocaleString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.BILLING_SHEET_ID,
    range: `${SHEET_NAMES.BILLING_SHEET}!A:K`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        soNo,
        skuCode,
        cycleID,
        product,
        customer,
        partyPO,
        route,
        division,
        Number(dispatchQty),
        "Pending",
        now,
      ]],
    },
  });

  return true;
};


export const getBillingOrders = async () => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.BILLING_SHEET_ID,
    range: `${SHEET_NAMES.BILLING_SHEET}!A:K`,
  });

  const rows = response.data.values || [];

  if (rows.length <= 1) {
    return [];
  }

  return rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    soNo: row[BILLING_COLUMNS.SO_NO] || "",
    skuCode: row[BILLING_COLUMNS.SKU_CODE] || "",
    cycleID: row[BILLING_COLUMNS.CYCLE_ID] || "",
    product: row[BILLING_COLUMNS.PRODUCT] || "",
    customer: row[BILLING_COLUMNS.CUSTOMER] || "",
    partyPO: row[BILLING_COLUMNS.PARTY_PO] || "",
    route: row[BILLING_COLUMNS.ROUTE] || "",
    division: row[BILLING_COLUMNS.DIVISION] || "",
    dispatchQty: Number(row[BILLING_COLUMNS.DISPATCH_QTY]) || 0,
    billing: row[BILLING_COLUMNS.BILLING] || "Pending",
    createdAt: row[BILLING_COLUMNS.CREATED_AT] || "",
  }));
};


export const updateBillingStatus = async ({
  soNo,
  skuCode,
  cycleID,
  status,
}) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.BILLING_SHEET_ID,
    range: `${SHEET_NAMES.BILLING_SHEET}!A:K`,
  });

  const rows = response.data.values || [];

  const rowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      String(row[BILLING_COLUMNS.SO_NO]).trim() === String(soNo).trim() &&
      String(row[BILLING_COLUMNS.SKU_CODE]).trim() === String(skuCode).trim() &&
      String(row[BILLING_COLUMNS.CYCLE_ID]).trim() === String(cycleID).trim()
  );

  if (rowIndex === -1) {
    throw new Error("Billing order not found");
  }

  const rowNumber = rowIndex + 1;

  await updateCell({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    sheetName: SHEET_NAMES.BILLING_SHEET,
    range: `J${rowNumber}`,
    value: status,
  });

  return true;
};