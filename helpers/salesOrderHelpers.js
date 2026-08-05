import sheets, { auth } from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { appendDispatch } from "../services/dispatchSheet.js";
import { getSalesOrders } from "../services/salesOrderSheet.js";

export const addDirectDispatchOrder = async ({
  soNo,
  product,
  division,
  rate,
  sku,
  freight,
  qty,
  shippinglocation,
  billinglocation,
}) => {
  const authClient = await auth.getClient();

  const now = new Date().toLocaleString();

  await appendDispatch({ values: [
          soNo,  
          sku,     
          product,   
          division,
          0,          
          rate,
          shippinglocation, 
          billinglocation, 
          freight,
          0,          
          qty,       
          0,          
          qty,        
          "Ready To Dispatch", 
          now,        
          now,      
      ]
      ,});
     

  return true;
};



export const getRateFromSalesOrder = async ({ soNo, product }) => {
  const rows = await getSalesOrders(); // SalesOrderItems ya SalesOrder sheet
  const row = rows.find(
    (item) =>
      String(item[0]).trim() === String(soNo).trim() &&
      String(item[4]).trim().toLowerCase() ===
        String(product).trim().toLowerCase()
  );
  if (!row) {
    throw new Error(
      ` SO not found ${soNo} - ${product}`
    );
  }
console.log("billing location",row[20], "shipping location",row[21])
  // Rate column index
return {
  rate: Number(row[10] || 0),
  freight: row[15] === "" ? false : row[15] === true || String(row[15]).toLowerCase() === "true",
  jobWork: row[14] === "" ? false : row[14] === true || String(row[14]).toLowerCase() === "true",
  billingLocation: row[20] || "",
  shippingLocation: row[21] || "",
  skucode: row[2] || "",
};
};