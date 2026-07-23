import sheets from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import { updateDispatchedQty, updateOverallStatus } from "./salesOrderSheet.js";


export const appendDispatch = async ({values}) => {

  if (!values) {
    throw new Error("Value is required field");
  }

  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; 

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,

    range: `${SHEET_NAMES.DISPATCH_SHEET}!A:K`,

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

  const response =
    await sheets.spreadsheets.values.get({

      spreadsheetId:
        process.env.GOOGLE_SHEET_ID,

      range:
        `${SHEET_NAMES.DISPATCH_SHEET}!A2:K`,

    });


  const rows =
    response.data.values || [];


  return rows.map((row, index) => ({

    id:
      `${row[0]}-${row[1]}`,

    rowNumber:
      index + 2,

    soNo:
      row[0] || "",

    product:
      row[1] || "",

    division:
      row[2] || "",

    productionQty:
      Number(row[3] || 0),

    wastageQty:
      Number(row[4] || 0),

    nettQtyRTD:
      Number(row[5] || 0),

    dispatchQty:
      Number(row[6] || 0),

    availableQty:
      Number(row[7] || 0),

    status:
      row[8] || "",

    createdAt:
      row[9] || "",

    updatedAt:
      row[10] || "",

  }));

};

// =====================================================
// DISPATCH ORDER
// =====================================================

export const dispatchOrder = async ({

  soNo,

  product,

  dispatchQty,

}) => {


  if (!soNo) {

    throw new Error(
      "SO No is required"
    );

  }


  if (!product) {

    throw new Error(
      "Product is required"
    );

  }


  const qty =
    Number(dispatchQty);


  if (
    Number.isNaN(qty) ||
    qty <= 0
  ) {

    throw new Error(
      "Dispatch Qty must be greater than 0"
    );

  }


  const response =
    await sheets.spreadsheets.values.get({

      spreadsheetId:
        process.env.GOOGLE_SHEET_ID,

      range:
        `${SHEET_NAMES.DISPATCH_SHEET}!A2:K`,

    });


  const rows =
    response.data.values || [];


  const index =
    rows.findIndex(

      (row) =>

        String(row[0]).trim() ===
          String(soNo).trim() &&

        String(row[1]).trim() ===
          String(product).trim()

    );


  if (index === -1) {

    throw new Error(
      "Dispatch order not found"
    );

  }

  const rowNumber =
    index + 2;


  const nettQtyRTD =
    Number(
      rows[index][5] || 0
    );


  const oldDispatchQty =
    Number(
      rows[index][6] || 0
    );


  const availableQty =
    nettQtyRTD -
    oldDispatchQty;


  if (
    qty >
    availableQty
  ) {

    throw new Error(

      `Dispatch Qty cannot be greater than Available Qty (${availableQty})`

    );

  }


  const newDispatchQty =
    oldDispatchQty + qty;


  const newAvailableQty =
    nettQtyRTD -
    newDispatchQty;


  let status =
    "Ready To Dispatch";


  if (
    newAvailableQty === 0
  ) {

    status =
      "Fully Dispatched";

  }

  else if (
    newDispatchQty > 0
  ) {

    status =
      "Partially Dispatched";

  }


  const now =
    new Date().toLocaleString();


  // G = Dispatch Qty
  await sheets.spreadsheets.values.update({

    spreadsheetId:
      process.env.GOOGLE_SHEET_ID,

    range:
      `${SHEET_NAMES.DISPATCH_SHEET}!G${rowNumber}`,

    valueInputOption:
      "USER_ENTERED",

    requestBody: {

      values: [

        [
          newDispatchQty
        ]

      ],

    },

  });

  // update dispatch qty into sales order sheet 
  await updateDispatchedQty({
    soNo:soNo,
    product:product,
    dispatchedQty:newDispatchQty
  });

  // update overall status 
  await updateOverallStatus({
    soNo:soNo,
    product:product
  });

  // H = Available Qty
  await sheets.spreadsheets.values.update({

    spreadsheetId:
      process.env.GOOGLE_SHEET_ID,

    range:
      `${SHEET_NAMES.DISPATCH_SHEET}!H${rowNumber}`,

    valueInputOption:
      "USER_ENTERED",

    requestBody: {

      values: [

        [
          newAvailableQty
        ]

      ],

    },

  });


  // I = Status
  await sheets.spreadsheets.values.update({

    spreadsheetId:
      process.env.GOOGLE_SHEET_ID,

    range:
      `${SHEET_NAMES.DISPATCH_SHEET}!I${rowNumber}`,

    valueInputOption:
      "USER_ENTERED",

    requestBody: {

      values: [

        [
          status
        ]

      ],

    },

  });


  // K = Updated At
  await sheets.spreadsheets.values.update({

    spreadsheetId:
      process.env.GOOGLE_SHEET_ID,

    range:
      `${SHEET_NAMES.DISPATCH_SHEET}!K${rowNumber}`,

    valueInputOption:
      "USER_ENTERED",

    requestBody: {

      values: [

        [
          now
        ]

      ],

    },

  });


  return {

    soNo,

    product,

    dispatchQty:
      newDispatchQty,

    availableQty:
      newAvailableQty,

    status,

  };

};
