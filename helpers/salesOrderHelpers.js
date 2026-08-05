import sheets, { auth } from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { appendDispatch } from "../services/dispatchSheet.js";

export const addDirectDispatchOrder = async ({
  soNo,
  product,
  division,
  rate,
  freight,
  qty,
  shippinglocation,
  billinglocation,
}) => {
  const authClient = await auth.getClient();

  const now = new Date().toLocaleString();

  await appendDispatch({ values: [
          soNo,       
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
      String(item[2]).trim().toLowerCase() ===
        String(product).trim().toLowerCase()
  );

  if (!row) {
    throw new Error(
      `Rate not found for SO ${soNo} - ${product}`
    );
  }

  // Rate column index
  return {rate:Number(row[10] || 0),
    freight:row[15] === "" ? 0 : Number(row[15] || 0),
    jobWork:row[14] === "" ? 0 : Number(row[14] || 0),
    bilinglocation:row[20] || "",
    shippinglocation:row[21] || "",

  };
};