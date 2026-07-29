import sheets, { auth } from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { appendDispatch } from "../services/dispatchSheet.js";

export const addDirectDispatchOrder = async ({
  soNo,
  product,
  division,
  qty,
}) => {
  const authClient = await auth.getClient();

  const now = new Date().toLocaleString();

  await appendDispatch({ values: [
          soNo,        // A SO No
          product,     // B Product
          division,    // C Division
          0,           // D Production Qty
          0,           // E Wastage Qty
          qty,         // F Nett Qty (RTD)
          0,           // G Dispatch Qty
          qty,         // H Available Qty
          "Ready To Dispatch", // I Status
          now,         // J Created At
          now,         // K Updated At
      ]
      ,});
     

  return true;
};