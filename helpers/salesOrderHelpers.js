import sheets, { auth } from "../config/db.js";
import { SALES_COLUMNS } from "../constants/salesColumns.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { appendDispatch } from "../services/dispatchSheet.js";
import { getSalesOrders } from "../services/salesOrderSheet.js";

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
          now,        
          now,      
      ]
      ,});
     

  return true;
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