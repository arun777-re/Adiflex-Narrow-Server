import sheets, { auth } from "../config/db.js";
import { SALES_COLUMN_LETTERS, SALES_COLUMNS } from "../constants/salesColumns.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { appendDispatch } from "../services/dispatchSheet.js";
import { findFGStockBySKU } from "../services/fgSheets.js";
import { getProductBySkuService } from "../services/productSheet.js";
import { getLastSalesOrderNumber, getSalesOrders } from "../services/salesOrderSheet.js";

// ==========================================
// REQUEST LEVEL CACHE
// ==========================================
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const productCache = new Map();
export const fgCache = new Map();

export const addDirectDispatchOrder = async ({
  soNo,
  cycleID,
  product,
  customer,
  division,
  rate,
  sku,
  freight,
  qty,
  shippinglocation,
  billinglocation,
  route,
  partyPO="",
}) => {
  const authClient = await auth.getClient();

  const now = new Date().toLocaleString();

  await appendDispatch({ values: [
          soNo,  
          sku,    
          cycleID, 
          product,
          customer,
          "",
          "",
          partyPO, 
          route,  
          division,
          0,          
          rate,
          shippinglocation, 
          billinglocation, 
          freight,
          0,  /* freight rs must be added at the time of dispatch*/
          0,          /*wastage qty*/ 
          0,        /*dispatch qty*/ 
          qty,        /*available qty*/ 
          "Ready To Dispatch", 
          "",
          now,        
          now,      
      ]
      ,});
     

  return true;
};

export const mapSalesOrderRow = (row = []) => {
  return {
    soNo: row[SALES_COLUMNS.SO_NO] ?? "",
    date: row[SALES_COLUMNS.DATE] ?? "",

    skucode: row[SALES_COLUMNS.SKU_CODE] ?? "",
    customer: row[SALES_COLUMNS.CUSTOMER] ?? "",
    product: row[SALES_COLUMNS.PRODUCT_NAME] ?? "",

    ordertype: row[SALES_COLUMNS.ORDER_TYPE] ?? "",
    route: row[SALES_COLUMNS.ROUTE] ?? "",
    partyPO: row[SALES_COLUMNS.PARTY_PO] ?? "",

    division: row[SALES_COLUMNS.DIVISION] ?? "",

    soQty: Number(row[SALES_COLUMNS.SO_QTY]) || 0,
    unit: row[SALES_COLUMNS.UNIT] ?? "",

    soQtyInMeter:
      Number(row[SALES_COLUMNS.SO_QTY_IN_METER]) || 0,

    rate:
      Number(row[SALES_COLUMNS.STANDARD_RATE]) || 0,

    rateadjustment:
      Number(row[SALES_COLUMNS.RATE_ADJUSTMENT]) || 0,

    finalrate:
      Number(row[SALES_COLUMNS.FINAL_RATE]) || 0,

    openingFGQty:
      Number(row[SALES_COLUMNS.OPENING_FG_QTY]) || 0,

    productionQty:
      Number(row[SALES_COLUMNS.PRODUCTION_QTY]) || 0,

    jobWork:
      row[SALES_COLUMNS.JOB_WORK] === true ||
      String(row[SALES_COLUMNS.JOB_WORK] ?? "").toLowerCase() === "true" ||
      String(row[SALES_COLUMNS.JOB_WORK] ?? "").toLowerCase() === "yes",

    freight:
      Number(row[SALES_COLUMNS.FREIGHT]) || 0,

    manufacturedQty:
      Number(row[SALES_COLUMNS.MANUFACTURED_QTY]) || 0,

    dispatchedQty:
      Number(row[SALES_COLUMNS.DISPATCHED_QTY]) || 0,

    orderReceivedBy:
      row[SALES_COLUMNS.ORDER_RECEIVED_BY] ?? "",

    overallStatus:
      row[SALES_COLUMNS.OVERALL_STATUS] ?? "",

    billinglocation:
      row[SALES_COLUMNS.BILLING_LOCATION] ?? "",

    shippinglocation:
      row[SALES_COLUMNS.SHIPPING_LOCATION] ?? "",

    orderAmount:
      Number(row[SALES_COLUMNS.ORDER_AMOUNT]) || 0,
  };
};
export const getProductMasterCached = async (sku) => {
  if (!sku) {
    throw new Error("SKU is required");
  }

  // Already fetched
  if (productCache.has(sku)) {
    return productCache.get(sku);
  }

  // First request
  const productPromise = getProductBySkuService(sku);

  // Store Promise itself
  productCache.set(sku, productPromise);

  return productPromise;
};

export const getFGCached = async (sku) => {
  if (!sku) {
    throw new Error("SKU is required");
  }

  // Already fetched / cached
  if (fgCache.has(sku)) {
    return fgCache.get(sku);
  }

  // First request
  const fgStock = await findFGStockBySKU(sku);

  // Store actual data
  fgCache.set(sku, fgStock);

  return fgStock;
};


// get information from the sales Order sheet 
export const getRateFromSalesOrder = async ({ soNo, product }) => {
  const rows = await getSalesOrders(); // SalesOrder Items ya SalesOrder sheet
  const row = rows.find(
    (item) =>
      String(item[SALES_COLUMNS.SO_NO]).trim() === String(soNo).trim() &&
      String(item[SALES_COLUMNS.PRODUCT]).trim().toLowerCase() ===
        String(product).trim().toLowerCase()
  );
  if (!row) {
    throw new Error(
      ` SO not found ${soNo} - ${product}`
    );
  }
  // Rate column index
  console.log("row", row[SALES_COLUMNS.FINAL_RATE],'billing location',row[SALES_COLUMNS.BILLING_LOCATION],
    'SHIPPING LOCATION', row[SALES_COLUMNS.SHIPPING_LOCATION]
  );

  console.log("sales row....:",row)

return {
  rate: Number(row[SALES_COLUMNS.FINAL_RATE] || 0),
  freight: row[SALES_COLUMNS.FREIGHT] === "" ? false : row[SALES_COLUMNS.FREIGHT] === true || String(row[SALES_COLUMNS.FREIGHT]).toLowerCase() === "true",
  jobWork: row[SALES_COLUMNS.JOB_WORK] === "" ? false : row[SALES_COLUMNS.JOB_WORK] === true || String(row[SALES_COLUMNS.JOB_WORK]).toLowerCase() === "true",
  billingLocation: row[SALES_COLUMNS.BILLING_LOCATION] || "",
  shippingLocation: row[SALES_COLUMNS.SHIPPING_LOCATION] || "",
  skucode: row[SALES_COLUMNS.SKU_CODE] || "",
  route:row[SALES_COLUMNS.ROUTE] || "",
  partyPO:row[SALES_COLUMNS.PARTY_PO] || "",
  customer:row[SALES_COLUMNS.CUSTOMER] || ""
};
};


// CONVERT SO QTY TO METER 
export const convertToMeter = ({
  qty,
  unit,
  basicUnit="METER",
  meterPerRoll,
  meterPerKg,
}) => {
  const normalizedUnit = String(unit).trim().toUpperCase();
  const normalizedBasicUnit = String(basicUnit).trim().toUpperCase();

  if (normalizedUnit === "METER") {
    return qty;
  }

  if (normalizedUnit === "ROLL") {
    if (!meterPerRoll) {
      throw new Error("METER/ROLL conversion is missing");
    }

    return qty * Number(meterPerRoll);
  }

  if (normalizedUnit === "KG") {
    if (!meterPerKg) {
      throw new Error("METER/KG conversion is missing");
    }

    return qty * Number(meterPerKg);
  }

  throw new Error(`Unsupported unit: ${unit}`);
};

export const generateNextSoNo = async () => {
  const rows = await getSalesOrders();

  console.log("🔥 TOTAL SALES ORDER ROWS:", rows.length);

  let maxNumber = 0;

  for (const row of rows) {
    const so = String(row[0] || "").trim();

    if (!so.startsWith("ANF")) continue;

    const number = parseInt(so.slice(3), 10);

    console.log("🔥 FOUND SO:", so, "NUMBER:", number);

    if (!Number.isNaN(number) && number > maxNumber) {
      maxNumber = number;
    }
  }

  const nextSo = `ANF${String(maxNumber + 1).padStart(5, "0")}`;

  console.log("🔥 MAX SO NUMBER:", maxNumber);
  console.log("🔥 GENERATED SO:", nextSo);

  return nextSo;
};

// BATCH UPDATE SALES ORDER CELLS
export const updateSalesOrderCellsBatch = async ({
  rowNumber,
  updates,
}) => {
  if (!updates?.length) return;

  const data = updates.map(([columnLetter, value]) => ({
    range: `${SHEET_NAMES.SALES_MASTER}!${columnLetter}${rowNumber}`,
    values: [[value]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,

    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });
};

// =========================================================
// SALES ORDER UPDATE FIELD MAP
// column letter -> update object field
// =========================================================

const SALES_UPDATE_FIELDS = {
  [SALES_COLUMN_LETTERS.SO_QTY]: "soQty",
  [SALES_COLUMN_LETTERS.SO_QTY_IN_METER]: "soQtyInMeter",
  [SALES_COLUMN_LETTERS.STANDARD_RATE]: "rate",
  [SALES_COLUMN_LETTERS.RATE_ADJUSTMENT]: "rateadjustment",
  [SALES_COLUMN_LETTERS.FINAL_RATE]: "finalrate",
  [SALES_COLUMN_LETTERS.UNIT]: "unit",
  [SALES_COLUMN_LETTERS.JOB_WORK]: "jobWork",
  [SALES_COLUMN_LETTERS.SHIPPING_LOCATION]: "shippinglocation",
  [SALES_COLUMN_LETTERS.BILLING_LOCATION]: "billinglocation",
  [SALES_COLUMN_LETTERS.ROUTE]: "route",
  [SALES_COLUMN_LETTERS.SKU_CODE]: "skucode",
};


// =========================================================
// UPDATE SALES ORDER BY SO NO
// =========================================================

export const updateSalesOrderBySoNo = async (
  soNo,
  updates = {}
) => {
  try {
    // -----------------------------------------------------
    // 1. VALIDATE SO NUMBER
    // -----------------------------------------------------

    const targetSoNo = String(soNo ?? "").trim();

    if (!targetSoNo) {
      return null;
    }


    // -----------------------------------------------------
    // 2. GET SALES ORDERS
    // -----------------------------------------------------

    const rows = await getSalesOrders();

    if (!rows?.length || rows.length <= 1) {
      return null;
    }


    // -----------------------------------------------------
    // 3. FIND SALES ORDER
    // -----------------------------------------------------

    const rowIndex = rows.findIndex(
      (row, index) =>
        index > 0 &&
        String(row?.[SALES_COLUMNS.SO_NO] ?? "").trim() ===
          targetSoNo
    );

    if (rowIndex === -1) {
      return null;
    }


    // Google Sheet row number
    // Array index 0 = header
    const sheetRowNumber = rowIndex + 1;


    // -----------------------------------------------------
    // 4. BUILD UPDATE ARRAY
    // -----------------------------------------------------

    const updatesToApply = Object.entries(SALES_UPDATE_FIELDS)
      .map(([columnLetter, field]) => [
        columnLetter,
        updates[field],
      ])
      .filter(([, value]) => value !== undefined);


    // Nothing to update
    if (!updatesToApply.length) {
      return {
        soNo: targetSoNo,
        message: "No fields to update",
      };
    }


    // -----------------------------------------------------
    // 5. ONE GOOGLE SHEET WRITE
    // -----------------------------------------------------

    await updateSalesOrderCellsBatch({
      rowNumber: sheetRowNumber,
      updates: updatesToApply,
    });


    // -----------------------------------------------------
    // 6. UPDATE LOCAL ROW
    // -----------------------------------------------------

    const updatedRow = [...rows[rowIndex]];

    for (const [columnLetter, value] of updatesToApply) {

      const columnKey = Object.keys(SALES_COLUMN_LETTERS).find(
        (key) =>
          SALES_COLUMN_LETTERS[key] === columnLetter
      );

      if (columnKey !== undefined) {
        updatedRow[SALES_COLUMNS[columnKey]] = value;
      }
    }


    // -----------------------------------------------------
    // 7. RETURN UPDATED SALES ORDER
    // -----------------------------------------------------

    return mapSalesOrderRow(updatedRow);

  } catch (error) {

    console.error(
      `[UPDATE SO] Failed for ${soNo}:`,
      error
    );

    throw error;
  }
};