import sheets, { auth, updateCell } from "../config/db.js";
import { FG_COLUMNS, FG_COLUMNS_LETTERS } from "../constants/FGColumns.js";
import { SALES_COLUMNS } from "../constants/salesColumns.js";

import { SHEET_NAMES } from "../constants/sheetNames.js";
import { fgCache } from "../helpers/salesOrderHelpers.js";

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
export const findFGStockBySKU = async (skuCode) => {
  if (!skuCode) {
    throw new Error("SKU Code is required");
  }

  const response = await getFGInventory();

  // header remove
  const data = response.slice(1);
  const index = data.findIndex(
    (row) =>
      String(row[FG_COLUMNS.SKU_CODE] || "")
        .trim()
        .toLowerCase() === String(skuCode).trim().toLowerCase(),
  );

  console.log("FGFGFGFGFG ROW FOUND INVENTORY",response,"indexxxx",index)
  // SKU FG sheet mein nahi mila
  if (index === -1) {
    return {
      found: false,
      skuCode,
      availableQty: 0,
      reservedQty: 0,
      dispatchedQty: 0,
    };
  }

  const row = data[index];

  return {
    found: true,

    rowNumber: index + 2,

    skuCode: row[FG_COLUMNS.SKU_CODE] || "",

    productName: row[FG_COLUMNS.PRODUCT] || "",

    division: row[FG_COLUMNS.DIVISION] || "",

    unit: row[FG_COLUMNS.UNIT] || "",

    availableQty: Number(row[FG_COLUMNS.AVAILABLE_QTY]) || 0,

    reservedQty: Number(row[FG_COLUMNS.RESERVED_QTY]) || 0,

    dispatchedQty: Number(row[FG_COLUMNS.DISPATCHED_QTY]) || 0,

    location: row[FG_COLUMNS.LOCATION] || "",
  };
};

// service to append fg into fg sheet
export const handleInternalFG = async ({ soNo, product, qty, updatedBy }) => {
  const authClient = await auth.getClient();

  // ==========================================
  // GET SALES ORDER
  // ==========================================

  const salesRows = await getSalesOrders();

  const salesRow = salesRows.find(
    (item) =>
      item[SALES_COLUMNS.SO_NO] === soNo &&
      item[SALES_COLUMNS.PRODUCT] === product,
  );

  if (!salesRow) {
    throw new Error("Sales Order not found");
  }

  const orderType = String(salesRow[SALES_COLUMNS.ORDER_TYPE] || "").trim().toLowerCase();

  // Only Internal Orders
  if (orderType !== "internal") {
    return true;
  }

  console.log("sales rowwwwww",salesRow);
  const sku = salesRow[SALES_COLUMNS.SKU_CODE];
  const division = salesRow[SALES_COLUMNS.DIVISION];
  const unit = salesRow[SALES_COLUMNS.UNIT] || "METER";

  const quantity = Number(qty);

if (!Number.isFinite(quantity) || quantity <= 0) {
  throw new Error("Valid FG quantity is required");
}
  // ==========================================
  // GET FG INVENTORY
  // ==========================================
  const now = new Date().toLocaleString();

  const fgStock = await findFGStockBySKU(sku);

  // ==========================================
  // SKU NOT FOUND -> INSERT
  // ==========================================

  if (!fgStock.found) {
    await sheets.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
      range: `${SHEET_NAMES.INVENTORY_SHEET}!A:J`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            sku,
            product,
            division,
            unit,
            quantity,
            0,
            0,
            "",
            now,
            updatedBy,
          ],
        ],
      },
    });

    return true;
  }

  // ==========================================
  // SKU FOUND -> UPDATE STOCK
  // ==========================================

  const oldQty = Number(fgStock.availableQty || 0);

  const newQty = oldQty + quantity;

  // AVAILABLE QTY NEW
  await updateCell({
    spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
    sheetName: SHEET_NAMES.INVENTORY_SHEET,
    division:division,
    range: `${FG_COLUMNS_LETTERS.AVAILABLE_QTY}${fgStock.rowNumber}`,
    value: newQty,
  });

  // LAST UPDATED COLUMN
  await updateCell({
    spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
    sheetName: SHEET_NAMES.INVENTORY_SHEET,
    division:division,
    range: `${FG_COLUMNS_LETTERS.LAST_UPDATED}${fgStock.rowNumber}`,
    value: now,
  });

  // UPDATED BY
  await updateCell({
    spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
    sheetName: SHEET_NAMES.INVENTORY_SHEET,
    division:division,
    range: `${FG_COLUMNS_LETTERS.UPDATED_BY}${fgStock.rowNumber}`,
    value: updatedBy,
  });

  return true;
};

export const getFGAvailableQtyService = async (sku) => {
  try {
    const fgStock = await findFGStockBySKU(sku);

    console.log("fgfgfgfg", fgStock);

    if (!fgStock?.found) {
      return 0;
    }

    return Number(fgStock.availableQty) || 0;

  } catch (error) {
    throw error;
  }
};

// ==========================================
// CONSUME FG STOCK
// ==========================================

export const consumeFGStockService = async ({
  sku,
  qty,
  updatedBy,
  fgStock,
}) => {
  try {
    if (!fgStock) {
      throw new Error("FG Stock data is required");
    }

    const availableQty = Number(fgStock.availableQty) || 0;
    const reduceQty = Number(qty) || 0;

    if (availableQty < reduceQty) {
      throw new Error(
        `Insufficient FG Stock. Available: ${availableQty}, Required: ${reduceQty}`
      );
    }

    const newQty = availableQty - reduceQty;
    const now = new Date().toLocaleString();

    // ==========================================
    // UPDATE GOOGLE SHEET
    // ==========================================

    await updateCell({
      spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
      sheetName: SHEET_NAMES.INVENTORY_SHEET,
      range: `${FG_COLUMNS_LETTERS.AVAILABLE_QTY}${fgStock.rowNumber}`,
      value: newQty,
    });

    await updateCell({
      spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
      sheetName: SHEET_NAMES.INVENTORY_SHEET,
      range: `${FG_COLUMNS_LETTERS.LAST_UPDATED}${fgStock.rowNumber}`,
      value: now,
    });

    await updateCell({
      spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
      sheetName: SHEET_NAMES.INVENTORY_SHEET,
      range: `${FG_COLUMNS_LETTERS.UPDATED_BY}${fgStock.rowNumber}`,
      value: updatedBy,
    });

    // ==========================================
    // 🔥 UPDATE CACHE
    // ==========================================

    const cachedStock = fgCache.get(sku);

    if (cachedStock) {
      cachedStock.availableQty = newQty;
      cachedStock.lastUpdated = now;
      cachedStock.updatedBy = updatedBy;

      fgCache.set(sku, cachedStock);
    }

    console.log(
      `📦 FG REDUCED | SKU: ${sku} | Before: ${availableQty} | Reduced: ${reduceQty} | After: ${newQty}`
    );

    return {
      ...fgStock,
      availableQty: newQty,
    };

  } catch (error) {
    throw error;
  }
};

// ==========================================
// ADD FG STOCK
// ==========================================

export const addFGStockService = async ({
  sku,
  product,
  division,
  unit,
  location,
  qty,
  updatedBy,
}) => {
  try {
    const authClient = await auth.getClient();

    const fgStock = await findFGStockBySKU(sku);

    const now = new Date().toLocaleString();

    // SKU NOT FOUND
    if (!fgStock) {
      await sheets.spreadsheets.values.append({
        auth: authClient,
        spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
        range: `${SHEET_NAMES.INVENTORY_SHEET}!A:J`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [
            [
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
            ],
          ],
        },
      });

      return true;
    }

    // SKU FOUND
    const availableQty = Number(fgStock.row[4] || 0);

    await updateCell({
      spreadsheetId: process.env.FG_INVENTORY_SHEET_ID,
      sheetName: SHEET_NAMES.INVENTORY_SHEET,
      range: `E${fgStock.rowNumber}`,
      value: availableQty + Number(qty),
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
  } catch (error) {
    throw error;
  }
};

// =====================================================
// ADD NEW PRODUCT TO FG
// =====================================================

export const addNewProductToFG = async ({
  skuCode,
  product,
  division,
}) => {
  try {
    if (!skuCode) {
      throw new Error("SKU Code is required");
    }

    if (!product) {
      throw new Error("Product is required");
    }

    const authClient = await auth.getClient();

    const sheets = google.sheets({
      version: "v4",
      auth: authClient,
    });

    const now = new Date().toISOString();

    const newFGRow = [
      skuCode,       // A - SKU CODE
      product,       // B - PRODUCT
      division,      // C - DIVISION
      0,             // D - AVAILABLE QTY
      0,             // E - DISPATCH QTY
      0,             // F - OPENING QTY
      now,           // G - CREATED AT
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,

      range: `${SHEET_NAMES.FG_SHEET}!A:G`,

      valueInputOption: "USER_ENTERED",

      insertDataOption: "INSERT_ROWS",

      requestBody: {
        values: [newFGRow],
      },
    });

    console.log("✅ NEW PRODUCT ADDED TO FG:", {
      skuCode,
      product,
      division,
    });

    return {
      success: true,
      skuCode,
    };

  } catch (error) {

    console.error(
      "❌ ADD PRODUCT TO FG ERROR:",
      error
    );

    throw error;
  }
};
