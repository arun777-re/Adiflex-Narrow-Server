import { getDatabaseByDivision, updateCell } from "../config/db.js";
import { appendDispatch } from "../services/dispatchSheet.js";
import { handleInternalFG } from "../services/fgSheets.js";
import sheets, { auth } from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

import { getSalesOrders } from "../services/salesOrderSheet.js";
import { getRateFromSalesOrder } from "./salesOrderHelpers.js";

const getOrderType = async (soNo, product) => {
  const rows = await getSalesOrders();

  const data = rows.slice(1);

  const order = data.find((row) => row[0] === soNo && row[4] === product);

  if (!order) {
    throw new Error("Sales Order not found");
  }

  return order[5];
};

export const handleFinishedGoods = async ({
  soNo,
  product,
  division,
  manufacturedQty,
  wastageQty,
  updatedBy,
}) => {
  const nettQty = manufacturedQty - wastageQty;

  const orderType = await getOrderType(soNo, product);
  const rate = getRateFromSalesOrder({soNo,product});

  if (orderType === "Customer") {
    await appendDispatch({
      values: [
        soNo,
        product,
        division,
        manufacturedQty,
        rate,
        wastageQty,
        nettQty,
        0,
        nettQty,
        "Ready To Dispatch",
        new Date().toLocaleString(),
        new Date().toLocaleString(),
      ],
    });
  } else {
    await handleInternalFG({
      soNo,
      product,
      qty: nettQty,
      updatedBy,
    });
  }

  return nettQty;
};

export const createNextProductionCycle = async ({
  division,
  currentRow,
  remainingQty,
}) => {
  const authClient = await auth.getClient();

  // Current row se basic data uthao
  const values = [
    [
      currentRow[0], // SO No
      currentRow[1], // SKU Code
      currentRow[2], // Product
      currentRow[3], // Order Type
      remainingQty, // Target Qty (Remaining)
      currentRow[5], // Division

      "", // Production Qty

      currentRow[7], // Job Work

      "",
      "",

      "",
      "",
      "", // Warping

      "",
      "",
      "", // Filling

      "",
      "",
      "", // Machine

      "",
      "",
      "", // Finishing

      "",
      "",
      "", // Quality

      0, // Wastage Qty

      "",
      "",
      "", // Rolling

      "",
      "",
      "", // Packing

      "Pending", // Status

      "", // Nett Qty RTD

      "", // Updated By

      "", // Updated Time
    ],
  ];
  const spreadSheetId = await getDatabaseByDivision(division);

  await sheets.spreadsheets.values.append({
    auth: authClient,
    spreadsheetId: spreadSheetId,
    range: `${SHEET_NAMES.PRODUCTION_SHEET}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });

  return true;
};
