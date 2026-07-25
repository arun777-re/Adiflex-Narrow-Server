import sheets, { auth } from "../config/db.js";

import { SHEET_NAMES } from "../constants/sheetNames.js";

import { getSalesOrders } from "./salesOrderSheet.js"; 


// service to append fg into fg sheet
export const handleInternalFG = async ({
  soNo,
  product,
  qty,
  updatedBy,
}) => {
  const authClient = await auth.getClient();

  // Get Sales Orders
  const rows = await getSalesOrders();

  const row = rows.find(
    (item) =>
      item[0] === soNo &&
      item[4] === product
  );

  if (!row) {
    throw new Error("Sales Order not found");
  }

  const orderType = row[5];
  const division = row[6];

  // Only Internal Orders
  if (orderType !== "Internal") {
    return;
  }

  let sheetName = "";

  switch (division) {
    case "Woven":
      sheetName = SHEET_NAMES.FG_WOVEN;
      break;

    case "Crochet":
      sheetName = SHEET_NAMES.FG_CROCHET;
      break;

    default:
      throw new Error("Invalid Division");
  }

  await sheets.spreadsheets.values.append({
    auth: authClient,
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: sheetName,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          new Date().toISOString(),
          soNo,
          product,
          division,
          qty,
          updatedBy,
        ],
      ],
    },
  });

  return true;
};