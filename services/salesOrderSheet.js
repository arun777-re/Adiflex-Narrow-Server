import { auth, getDatabaseByDivision, updateCell } from "../config/db.js";
import sheets from "../config/db.js";
import { DISPATCH_COLUMNS } from "../constants/dispatch.js";
import { PRODUCT_COLUMNS } from "../constants/productColumns.js";
import { SALES_COLUMNS ,SALES_COLUMN_LETTERS} from "../constants/salesColumns.js";
import { SHEET_NAMES,SHEETS_FROM_ENV_ID } from "../constants/sheetNames.js";
import { convertToMeter, getProductMasterCached, updateSalesOrderBySoNo } from "../helpers/salesOrderHelpers.js";

const salesOrderSpreadsheetId = process.env.GOOGLE_SHEET_ID;

const WOVEN_SHEET_ID = process.env.WOVEN_DATABASE_ID;



export const ALLOWED_DIVISIONS = ["woven", "crochet"];

// get all sales order
export const getSalesOrders = async () => {
  const authClient = await auth.getClient();

  const response = await sheets.spreadsheets.values.get({
    auth: authClient,

    spreadsheetId: salesOrderSpreadsheetId,

    range: `${SHEET_NAMES.SALES_MASTER}!A:Z`,
  });

  return response.data.values || [];
};

// append sales order
export const appendMultipleSalesOrders = async (values) => {
  const authClient = await auth.getClient();

  await sheets.spreadsheets.values.append({
    auth: authClient,

    spreadsheetId: salesOrderSpreadsheetId,

    range: `${SHEET_NAMES.SALES_MASTER}!A:Z`,

    valueInputOption: "USER_ENTERED",

    insertDataOption: "INSERT_ROWS",

    requestBody: {
      values,
    },
  });
};

// append sales order to production process according to division
export const appendSalesOrderToProductionProcess = async (
  values,
  divisions
) => {
  try {
    console.log("values",values)
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("Production values are required");
    }

    if (!Array.isArray(divisions) || divisions.length === 0) {
      throw new Error("Division is required");
    }

    const authClient = await auth.getClient();

    // Unique divisions only
    const uniqueDivisions = [
      ...new Set(
        divisions.map((division) =>
          String(division).trim().toLowerCase()
        )
      ),
    ];

    await Promise.all(
      uniqueDivisions.map(async (division) => {
        // ==========================================
        // ONLY THIS DIVISION'S ROWS
        // ==========================================

        const divisionValues = values.filter(
          (row) =>
            String(row[7] || "")
              .trim()
              .toLowerCase() === division
        );

        // Nothing to append
        if (divisionValues.length === 0) {
          return;
        }

        // ==========================================
        // GET DATABASE
        // ==========================================

        const spreadsheetId =
          getDatabaseByDivision(division);

        if (!spreadsheetId) {
          throw new Error(
            `No database configured for division: ${division}`
          );
        }

        console.log(
          `🚀 Appending ${divisionValues.length} rows to ${division}`
        );

        // ==========================================
        // APPEND
        // ==========================================

        await sheets.spreadsheets.values.append({
          auth: authClient,
          spreadsheetId,
          range: `${SHEET_NAMES.PRODUCTION_SHEET}!A:J`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: {
            values: divisionValues,
          },
        });
      })
    );

    console.log(
      "✅ Production process appended division-wise"
    );

    return true;
  } catch (error) {
    console.error(
      "❌ appendSalesOrderToProductionProcess:",
      error
    );

    throw error;
  }
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


// ==========================================
// UPDATE SALES ORDER AFTER DISPATCH
// ==========================================

export const updateSalesOrderAfterDispatch = async ({
  soNo,
  product,
  dispatchedQty,
  salesRows,
}) => {
  const rows = salesRows || [];

  const rowIndex = rows.findIndex(
    (row) =>
      String(row[SALES_COLUMNS.SO_NO] || "").trim() ===
        String(soNo || "").trim() &&
      String(row[SALES_COLUMNS.PRODUCT] || "").trim() ===
        String(product || "").trim(),
  );

  if (rowIndex === -1) {
    throw new Error("Sales Order not found");
  }

  const row = rows[rowIndex];

  const qtyToAdd = Number(dispatchedQty);

  if (!Number.isFinite(qtyToAdd) || qtyToAdd <= 0) {
    throw new Error("Invalid dispatched quantity");
  }

  const soQty =
    Number(row[SALES_COLUMNS.SO_QTY]) || 0;

  const manufacturedQty =
    Number(row[SALES_COLUMNS.MANUFACTURED_QTY]) || 0;

  const oldDispatchedQty =
    Number(row[SALES_COLUMNS.DISPATCHED_QTY]) || 0;

  const newDispatchedQty =
    oldDispatchedQty + qtyToAdd;

  let status = "Pending";

  if (manufacturedQty > 0) {
    status = "In Production";
  }

  if (manufacturedQty >= soQty && soQty > 0) {
    status = "Ready To Dispatch";
  }

  if (
    newDispatchedQty > 0 &&
    newDispatchedQty < manufacturedQty
  ) {
    status = "Partially Dispatched";
  }

  if (
    manufacturedQty > 0 &&
    newDispatchedQty >= manufacturedQty
  ) {
    status = "Completed";
  }

  // ==========================================
  // BATCH UPDATE
  // ==========================================

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: salesOrderSpreadsheetId,

    requestBody: {
      valueInputOption: "USER_ENTERED",

      data: [
        {
          range: `${SHEET_NAMES.SALES_MASTER}!${SALES_COLUMN_LETTERS.DISPATCHED_QTY}${rowIndex + 1}`,
          values: [[newDispatchedQty]],
        },

        {
          range: `${SHEET_NAMES.SALES_MASTER}!${SALES_COLUMN_LETTERS.OVERALL_STATUS}${rowIndex + 1}`,
          values: [[status]],
        },
      ],
    },
  });

  return {
    dispatchedQty: newDispatchedQty,
    status,
  };
};


export const updateSalesOrderService = async ({
  soNo,
  soQty,
  rate,
  rateadjustment,
  finalrate,
  unit,
  jobWork,
  shippinglocation,
  billinglocation,
  route,
  skucode,
}) => {
  const startTime = performance.now();

  console.log("\n----------------------------------------");
  console.log("[SO UPDATE SERVICE] START");
  console.log("[SO UPDATE SERVICE] SO No:", soNo);

  try {
    // =========================================================
    // 1. VALIDATION
    // =========================================================

    const validationStart = performance.now();

    console.log("[SO UPDATE SERVICE] Validating input...");

    if (!soNo) {
      const error = new Error("Sales Order Number is required");
      error.statusCode = 400;
      throw error;
    }

    if (!skucode) {
      const error = new Error("SKU Code is required");
      error.statusCode = 400;
      throw error;
    }

    if (soQty == null || Number(soQty) < 0) {
      const error = new Error("Valid SO Quantity is required");
      error.statusCode = 400;
      throw error;
    }

    console.log(
      `[SO UPDATE SERVICE] Validation: ${(
        performance.now() - validationStart
      ).toFixed(2)}ms`
    );

    // =========================================================
    // 2. GET PRODUCT MASTER
    // =========================================================

    const productMasterStart = performance.now();

    console.log(
      `[SO UPDATE SERVICE] Getting Product Master for SKU: ${skucode}`
    );

    const productRow = await getProductMasterCached(skucode);

    const productMasterTime = performance.now() - productMasterStart;

    console.log(
      `[SO UPDATE SERVICE] Product Master lookup: ${productMasterTime.toFixed(
        2
      )}ms`
    );

    if (!productRow) {
      console.warn(
        `[SO UPDATE SERVICE] Product not found for SKU: ${skucode}`
      );

      const error = new Error(
        `Product not found for SKU: ${skucode}`
      );

      error.statusCode = 404;
      throw error;
    }

    // =========================================================
    // 3. PRODUCT MASTER DATA
    // =========================================================

    const basicUnit = productRow[PRODUCT_COLUMNS.UNIT];

    const meterPerRoll =
      Number(productRow[PRODUCT_COLUMNS.METERPERROLL]) || 0;

    const meterPerKg =
      Number(productRow[PRODUCT_COLUMNS.METERPERKG]) || 0;

    console.log("[SO UPDATE SERVICE] Product Master data:", {
      basicUnit,
      meterPerRoll,
      meterPerKg,
    });

    // =========================================================
    // 4. CONVERT SO QTY → METER
    // =========================================================

    const conversionStart = performance.now();

    console.log("[SO UPDATE SERVICE] Converting quantity to meter...");

    console.log("[SO UPDATE SERVICE] Conversion input:", {
      qty: Number(soQty),
      unit,
      basicUnit,
      meterPerRoll,
      meterPerKg,
    });

    const meterQty = await convertToMeter({
      qty: Number(soQty),
      unit,
      basicUnit,
      meterPerRoll,
      meterPerKg,
    });

    const conversionTime = performance.now() - conversionStart;

    console.log(
      `[SO UPDATE SERVICE] Convert To Meter: ${conversionTime.toFixed(
        2
      )}ms`
    );

    console.log(
      "[SO UPDATE SERVICE] Calculated Meter Qty:",
      meterQty
    );

    // =========================================================
    // 5. FINAL RATE
    // =========================================================

    const rateStart = performance.now();

    const calculatedFinalRate =
      rate != null
        ? Number(rate) + Number(rateadjustment || 0)
        : Number(finalrate || 0);

    console.log("[SO UPDATE SERVICE] Rate calculation:", {
      rate,
      rateadjustment,
      oldFinalRate: finalrate,
      calculatedFinalRate,
    });

    console.log(
      `[SO UPDATE SERVICE] Rate calculation: ${(
        performance.now() - rateStart
      ).toFixed(2)}ms`
    );

    // =========================================================
    // 6. BUILD UPDATE OBJECT
    // =========================================================

    const updatesStart = performance.now();

    const updates = {
      soQty: Number(soQty),
      rate: Number(rate || 0),
      rateadjustment: Number(rateadjustment || 0),
      finalrate: calculatedFinalRate,
      unit,
      jobWork: Boolean(jobWork),
      shippinglocation: shippinglocation?.trim() || "",
      billinglocation: billinglocation?.trim() || "",
      route: route?.trim() || "",
      skucode,
      soQtyInMeter: meterQty,
    };

    console.log("[SO UPDATE SERVICE] Update object:", updates);

    console.log(
      `[SO UPDATE SERVICE] Build update object: ${(
        performance.now() - updatesStart
      ).toFixed(2)}ms`
    );

    // =========================================================
    // 7. UPDATE SALES ORDER IN SHEET
    // =========================================================

    const sheetUpdateStart = performance.now();

    console.log(
      `[SO UPDATE SERVICE] Updating Sales Order Sheet: ${soNo}`
    );

    const updatedOrder = await updateSalesOrderBySoNo(
      soNo,
      updates
    );

    const sheetUpdateTime =
      performance.now() - sheetUpdateStart;

    console.log(
      `[SO UPDATE SERVICE] updateSalesOrderBySoNo: ${sheetUpdateTime.toFixed(
        2
      )}ms`
    );

    // =========================================================
    // 8. NOT FOUND
    // =========================================================

    if (!updatedOrder) {
      console.warn(
        `[SO UPDATE SERVICE] Sales Order not found: ${soNo}`
      );

      const error = new Error(
        `Sales Order not found: ${soNo}`
      );

      error.statusCode = 404;
      throw error;
    }

    // =========================================================
    // 9. FINAL RESULT
    // =========================================================

    const result = {
      ...updatedOrder,
      soQtyInMeter: meterQty,
    };

    const totalTime = performance.now() - startTime;

    console.log("[SO UPDATE SERVICE] SUCCESS");
    console.log("[SO UPDATE SERVICE] Result:", result);
    console.log(
      `[SO UPDATE SERVICE] TOTAL SERVICE TIME: ${totalTime.toFixed(
        2
      )}ms`
    );

    console.log("----------------------------------------\n");

    return result;
  } catch (error) {
    const totalTime = performance.now() - startTime;

    console.error("\n----------------------------------------");
    console.error("[SO UPDATE SERVICE] FAILED");
    console.error("[SO UPDATE SERVICE] SO No:", soNo);
    console.error("[SO UPDATE SERVICE] Error:", error);
    console.error(
      "[SO UPDATE SERVICE] Message:",
      error.message
    );
    console.error(
      "[SO UPDATE SERVICE] Status:",
      error.statusCode || 500
    );
    console.error(
      `[SO UPDATE SERVICE] FAILED AFTER: ${totalTime.toFixed(
        2
      )}ms`
    );
    console.error("----------------------------------------\n");

    throw error;
  }
};