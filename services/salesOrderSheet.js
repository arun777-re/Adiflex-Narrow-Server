import { auth } from "../config/db.js";
import sheets from "../config/db.js";

const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const sheetName = "Sales_Order";
const productionSheetName = "Production_Process";

// Read all orders
export const getSalesOrders = async () => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:O`,
  });
  return response.data.values || [];
};

// Append order
export const appendMultipleSalesOrders = async (values) => {
  const auth1 = await auth.getClient();
  await sheets.spreadsheets.values.append({
   auth: auth1,
    spreadsheetId:spreadsheetId,
    range: `${sheetName}!A:G`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });
};



// append sales order data to the production process sheet 
export const appendSalesOrderToProductionProcess = async (values) => {
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${productionSheetName}!A:E`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });
};


//  remove sales order by soNo
export const cancelSalesOrder = async(soNo)=>{
     const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sales_Order!A:H",
  });

  const rows = response.data.values || [];

  const index = rows.findIndex((row) => row[0] === soNo);

  if (index === -1) {
    throw new Error("Sales Order Not Found");
  }

  const rowNumber = index + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Sales_Order!H${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["Cancelled"]],
    },
  });

  return true;
}