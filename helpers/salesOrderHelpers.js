import sheets, { auth } from "../config/db.js";
import { SALES_COLUMNS } from "../constants/salesColumns.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { appendDispatch } from "../services/dispatchSheet.js";
import { findFGStockBySKU } from "../services/fgSheets.js";
import { getProductBySkuService } from "../services/productSheet.js";
import { getSalesOrders } from "../services/salesOrderSheet.js";

// ==========================================
// REQUEST LEVEL CACHE
// ==========================================

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
  const rows = await getSalesOrders(); // SalesOrderItems ya SalesOrder sheet
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
  console.log("row", row[SALES_COLUMNS.FINAL_RATE]);

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
  basicUnit,
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
  const rows = await getLastSalesOrderNumber();

  let maxNumber = 0;

  for (const row of rows) {
    const so = String(row[0] || "").trim();

    if (!so.startsWith("ANF")) continue;

    const number = parseInt(so.slice(3), 10);

    if (!Number.isNaN(number) && number > maxNumber) {
      maxNumber = number;
    }
  }

  return `ANF${String(maxNumber + 1).padStart(5, "0")}`;
};