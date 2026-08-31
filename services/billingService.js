// ==========================================
// APPEND BILLING ORDER
// ==========================================

import sheets, { updateCell } from "../config/db.js";
import {
  BILLING_COLUMNS,
  BILLING_COLUMNS_LETTER,
} from "../constants/billingColumns.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

export const appendBillingOrder = async ({
  soNo,
  skuCode,
  cycleID,
  shippinglocation,
  billinglocation,
  product,
  customer,
  partyPO,
  route,
  division,
  dispatchQty,
}) => {
  const now = new Date().toLocaleString();
  const billing_id = crypto.randomUUID();

  console.log("🔥 New Billing ID:", billing_id, "values coming..", {
    soNo,
    skuCode,
    cycleID,
    shippinglocation,
    billinglocation,
    product,
    customer,
    partyPO,
    route,
    division,
    dispatchQty,
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.BILLING_SHEET_ID,
    range: `${SHEET_NAMES.BILLING_SHEET}!A:K`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          billing_id,
          soNo,
          skuCode,
          shippinglocation,
          billinglocation,
          cycleID,
          product,
          customer,
          partyPO,
          route,
          division,
          Number(dispatchQty),
          "Pending",
          now,
        ],
      ],
    },
  });

  return true;
};

export const getBillingOrders = async () => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.BILLING_SHEET_ID,
    range: `${SHEET_NAMES.BILLING_SHEET}!A:N`,
  });

  const rows = response.data.values || [];

  if (rows.length <= 1) {
    return [];
  }

  return rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    billingID: row[BILLING_COLUMNS.BILLING_ID] || "",
    soNo: row[BILLING_COLUMNS.SO_NO] || "",
    skuCode: row[BILLING_COLUMNS.SKU_CODE] || "",
    shippinglocation: row[BILLING_COLUMNS.SHIPPING_LOCATION] || "",
    billinglocation: row[BILLING_COLUMNS.BILLING_LOCATION] || "",
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
  billingID,
  status,
}) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.BILLING_SHEET_ID,
    range: `${SHEET_NAMES.BILLING_SHEET}!A:L`,
  });

  const rows = response.data.values || [];

  const normalizedSO = String(soNo || "").trim();
  const normalizedSKU = String(skuCode || "").trim();
  const normalizedBilingID = String(billingID || "").trim();

  const rowIndex = rows.findIndex((row, index) => {
    if (index === 0) return false;

    const rowSO = String(row[BILLING_COLUMNS.SO_NO] || "").trim();

    const rowSKU = String(row[BILLING_COLUMNS.SKU_CODE] || "").trim();

    const rowCycle = String(row[BILLING_COLUMNS.BILLING_ID] || "").trim();

    // SO + SKU mandatory
    if (
      rowSO !== normalizedSO ||
      rowSKU !== normalizedSKU ||
      rowCycle !== normalizedBilingID
    ) {
      return false;
    }

    return true;
  });

  if (rowIndex === -1) {
    throw new Error("Billing order not found");
  }

  const rowNumber = rowIndex + 1;

  await updateCell({
    spreadsheetId: process.env.BILLING_SHEET_ID,
    sheetName: SHEET_NAMES.BILLING_SHEET,
    range: `${BILLING_COLUMNS_LETTER.BILLING}${rowNumber}`,
    value: status,
  });

  return true;
};
