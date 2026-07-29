import sheets, { auth, updateCell } from "../config/db.js";

import { SHEET_NAMES } from "../constants/sheetNames.js";

import { getSalesOrders } from "./salesOrderSheet.js"; 


// get fg inventory
export const getFGInventory = async () => {
  const authClient = await auth.getClient();

  const response = await sheets.spreadsheets.values.get({
    auth: authClient,
    spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
    range: `${SHEET_NAMES.INVENTORY_SHEET}!A:J`,
  });

  return response.data.values || [];
};

// find current stock by sku code 
export const findFGStockBySKU = async (sku) => {
  const rows = await getFGInventory();

  // Header remove
  const data = rows.slice(1);

  const index = data.findIndex(
    (row) => row[0] === sku
  );

  if (index === -1) {
    return null;
  }

  return {
    rowNumber: index + 2, // Actual Google Sheet Row
    row: data[index],
  };
};

// service to append fg into fg sheet
export const handleInternalFG = async ({
  soNo,
  product,
  qty,
  updatedBy,
}) => {
  const authClient = await auth.getClient();

  // ==========================================
  // GET SALES ORDER
  // ==========================================

  const salesRows = await getSalesOrders();

  const salesRow = salesRows.find(
    (item) =>
      item[0] === soNo &&
      item[4] === product
  );

  if (!salesRow) {
    throw new Error("Sales Order not found");
  }

  const orderType = salesRow[5];

  // Only Internal Orders
  if (orderType !== "Internal") {
    return true;
  }

  const sku = salesRow[2];
  const division = salesRow[6];
  const unit = salesRow[11];
  const location = salesRow[21];

  // ==========================================
  // GET FG INVENTORY
  // ==========================================
const now = new Date().toLocaleString();

const fgStock = await findFGStockBySKU(sku);

// ==========================================
// SKU NOT FOUND -> INSERT
// ==========================================

if (!fgStock) {
  await sheets.spreadsheets.values.append({
    auth: authClient,
    spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
    range: `${SHEET_NAMES.INVENTORY_SHEET}!A:J`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        sku,
        product,
        division,
        unit,
        Number(qty),
        0,
        0,
        location,
        now,
        updatedBy,
      ]],
    },
  });

  return true;
}

// ==========================================
// SKU FOUND -> UPDATE STOCK
// ==========================================

const oldQty = Number(fgStock.row[4] || 0);

const newQty = oldQty + Number(qty);

await updateCell({
  spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
  sheetName: SHEET_NAMES.INVENTORY_SHEET,
  range: `E${fgStock.rowNumber}`,
  value: newQty,
});

await updateCell({
  spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
  sheetName: SHEET_NAMES.INVENTORY_SHEET,
  range: `I${fgStock.rowNumber}`,
  value: now,
});

await updateCell({
  spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
  sheetName: SHEET_NAMES.INVENTORY_SHEET,
  range: `J${fgStock.rowNumber}`,
  value: updatedBy,
});

return true;
  
};