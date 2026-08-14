import sheets from "../config/db.js";
import { DISPATCH_COLUMNS, DISPATCH_SHEET_COLUMNS } from "../constants/dispatch.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { updateDispatchedQty, updateOverallStatus } from "./salesOrderSheet.js";

// function to append data to dispatch sheet

export const appendDispatch = async ({ values }) => {
  if (!values) {
    throw new Error("Value is required field");
  }

  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,

    range: `${SHEET_NAMES.DISPATCH_SHEET}!A:W`,

    valueInputOption: "USER_ENTERED",

    insertDataOption: "INSERT_ROWS",

    requestBody: {
      values: [values],
    },
  });
};

// =====================================================
// GET ALL DISPATCH ORDERS
// =====================================================

export const getAllDispatchOrders = async () => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!A2:W`,
  });

  const rows = response.data.values || [];

  return rows.map((row, index) => ({
    id: `${row[DISPATCH_COLUMNS.SO_NO]}-${row[DISPATCH_COLUMNS.SKU_CODE]}`,

    rowNumber: index + 2,

    soNo: row[DISPATCH_COLUMNS.SO_NO] || "",
    cycleID: row[DISPATCH_COLUMNS.CYCLE_ID] || "",

    skuCode: row[DISPATCH_COLUMNS.SKU_CODE] || "",

    product: row[DISPATCH_COLUMNS.PRODUCT] || "",
    customer:row[DISPATCH_COLUMNS.CUSTOMER] || "",
    vehicleNo:row[DISPATCH_COLUMNS.VEHICLE_NO] || "",
    driverName:row[DISPATCH_COLUMNS.DRIVER_NAME] || "",
    division: row[DISPATCH_COLUMNS.DIVISION] || "",

    productionQty: Number(
      row[DISPATCH_COLUMNS.PRODUCTION_QTY] || 0
    ),

    rate: Number(row[DISPATCH_COLUMNS.RATE] || 0),
    
    shippinglocation:
      row[DISPATCH_COLUMNS.SHIPPING_LOCATION] || "",
      route:row[DISPATCH_COLUMNS.ROUTE] || "",

    billinglocation:
      row[DISPATCH_COLUMNS.BILLING_LOCATION] || "",

    freight:
      row[DISPATCH_COLUMNS.FREIGHT] || false,
  

    wastageQty: Number(
      row[DISPATCH_COLUMNS.WASTAGE_QTY] || 0
    ),

    dispatchQty: Number(
      row[DISPATCH_COLUMNS.DISPATCH_QTY] || 0
    ),

    availableQty: Number(
      row[DISPATCH_COLUMNS.AVAILABLE_QTY] || 0
    ),

    status: row[DISPATCH_COLUMNS.STATUS] || "",

    createdAt:
      row[DISPATCH_COLUMNS.CREATED_AT] || "",

    updatedAt:
      row[DISPATCH_COLUMNS.UPDATED_AT] || "",
  }));
};

// =====================================================
// DISPATCH ORDER
// =====================================================

export const dispatchOrder = async ({
  soNo,
  cycleID,
  product,
  dispatchQty,
  freight=false,
  freightRs=0,
  driverName,
  vehicleNo,
  partyPO,

}) => {
  console.log("Dispatch Order:", { soNo, product, dispatchQty, freight, freightRs });
  if (!soNo) {
    throw new Error("SO No is required");
  }

  if (!product) {
    throw new Error("Product is required");
  }

  const qty = Number(dispatchQty);

  if (Number.isNaN(qty) || qty <= 0) {
    throw new Error("Dispatch Qty must be greater than 0");
  }

 const normalizedFreight =
  String(freight).trim().toLowerCase() === "true" || freight === true;

if (normalizedFreight) {
  if (
    freightRs === undefined ||
    freightRs === null ||
    freightRs === "" ||
    Number.isNaN(Number(freightRs)) ||
    Number(freightRs) <= 0
  ) {
    throw new Error(
      "Freight Rs must be greater than 0 when Freight Charges is Yes"
    );
  }
}

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!A2:W`,
  });


  const rows = response.data.values || [];

  const index = rows.findIndex(
    (row) =>
      String(row[DISPATCH_COLUMNS.SO_NO]).trim() === String(soNo).trim() &&
      String(row[DISPATCH_COLUMNS.PRODUCT]).trim() === String(product).trim() && 
      String(row[DISPATCH_COLUMNS.CYCLE_ID]).trim() === String(cycleID).trim()
  );
  console.log("Before:", rows[index]);

  if (index === -1) {
    throw new Error("Dispatch order not found");
  }

  const rowNumber = index + 2;

  const manufacturedQty = Number(
    rows[index][DISPATCH_COLUMNS.AVAILABLE_QTY] || 0
  );

  const oldDispatchQty = Number(
    rows[index][DISPATCH_COLUMNS.DISPATCH_QTY] || 0
  );

  const availableQty = Number(
    rows[index][DISPATCH_COLUMNS.AVAILABLE_QTY] ||
      (manufacturedQty - oldDispatchQty)
  );
  
  
  if (qty > availableQty) {
    throw new Error(
      `Dispatch Qty cannot be greater than Available Qty (${availableQty})`
    );
  }

  const newDispatchQty = oldDispatchQty + qty;

  const newAvailableQty = availableQty - qty;

  let status = "Ready To Dispatch";

  if (newAvailableQty === 0) {
    status = "Fully Dispatched";
  } else if (newDispatchQty > 0) {
    status = "Partially Dispatched";
  }

  const now = new Date().toLocaleString();

  // Dispatch Qty (Column L)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!${DISPATCH_SHEET_COLUMNS.DISPATCH_QTY}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newDispatchQty]],
    },
  });

  // Available Qty (Column M)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!${DISPATCH_SHEET_COLUMNS.AVAILABLE_QTY}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[newAvailableQty]],
    },
  });

  // Status (Column N)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!${DISPATCH_SHEET_COLUMNS.STATUS}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[status]],
    },
  });

  // Updated At (Column P)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!${DISPATCH_SHEET_COLUMNS.UPDATED_AT}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[now]],
    },
  });
  // Update Sales Order
  await updateDispatchedQty({
    soNo,
    product,
    dispatchedQty: newDispatchQty,
  });

  // Update Overall Status
  await updateOverallStatus({
    soNo,
    product,
  });

  return {
    soNo,
    product,
    dispatchQty: newDispatchQty,
    availableQty: newAvailableQty,
    status,
  };
};

export const markDispatchBillingDone = async ({
  soNo,
  skuCode,
  cycleID,
}) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!A2:W`,
  });

  const rows = response.data.values || [];

  const normalizedSoNo = String(soNo ?? "").trim();
  const normalizedSkuCode = String(skuCode ?? "").trim();
  const normalizedCycleID = String(cycleID ?? "").trim();

  const index = rows.findIndex((row) => {
    const rowSoNo = String(
      row[DISPATCH_COLUMNS.SO_NO] ?? ""
    ).trim();

    const rowSkuCode = String(
      row[DISPATCH_COLUMNS.SKU_CODE] ?? ""
    ).trim();

    const rowCycleID = String(
      row[DISPATCH_COLUMNS.CYCLE_ID] ?? ""
    ).trim();

    return (
      rowSoNo === normalizedSoNo &&
      rowSkuCode === normalizedSkuCode &&
      rowCycleID === normalizedCycleID
    );
  });

  if (index === -1) {
    throw new Error("Dispatch order not found");
  }

  const rowNumber = index + 2;

  // Already billed
  const currentBilling = String(
    rows[index][DISPATCH_COLUMNS.BILLING] ?? ""
  )
    .trim()
    .toLowerCase();

  if (currentBilling === "done") {
    throw new Error("Billing is already Done");
  }

  // Billing = Done
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.DISPATCH_SHEET}!U${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["Done"]],
    },
  });

  return {
    soNo,
    skuCode,
    cycleID: normalizedCycleID,
    billing: "Done",
  };
};
