import { auth, getDatabaseByDivision } from "../config/db.js";
import sheets from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

const salesOrderSpreadsheetId =
  process.env.GOOGLE_SHEET_ID;

  const WOVEN_SHEET_ID=process.env.WOVEN_DATABASE_ID;

  export const ALLOWED_DIVISIONS = [
    "woven",
    "crochet"
  ]

// get all sales order
export const getSalesOrders = async () => {

  const authClient =
    await auth.getClient();


  const response =
    await sheets.spreadsheets.values.get({

      auth: authClient,

      spreadsheetId:
        salesOrderSpreadsheetId,

      range:
        `${SHEET_NAMES.SALES_MASTER}!A:P`,

    });


  return (
    response.data.values ||
    []
  );

};


// append sales order
export const appendMultipleSalesOrders =
  async (values) => {

    const authClient =
      await auth.getClient();


    await sheets.spreadsheets.values.append({

      auth: authClient,

      spreadsheetId:
        salesOrderSpreadsheetId,

      range:
        `${SHEET_NAMES.SALES_MASTER}!A:P`,

      valueInputOption:
        "USER_ENTERED",

      insertDataOption:
        "INSERT_ROWS",

      requestBody: {

        values,

      },

    });

  };


// append sales order to production process according to division

export const appendSalesOrderToProductionProcess =
  async (
    values,
    division
  ) => {


    if (
      !division
    ) {

      throw new Error(
        "Division is required"
      );

    }


    // const spreadsheetId =
    //   getDatabaseByDivision(
    //     division
    //   );

    // if (
    //   !spreadsheetId
    // ) {

    //   throw new Error(
    //     `No database configured for division: ${division}`
    //   );

    // }


    const authClient =
      await auth.getClient();


    await sheets.spreadsheets.values.append({

      auth: authClient,

      spreadsheetId:WOVEN_SHEET_ID,

      range:
        `${SHEET_NAMES.PRODUCTION_SHEET}!A:F`,

      valueInputOption:
        "USER_ENTERED",

      insertDataOption:
        "INSERT_ROWS",

      requestBody: {

        values,

      },

    });

  };


// cancel sales order

export const cancelSalesOrder =
  async (
    soNo
  ) => {


    const authClient =
      await auth.getClient();


    const response =
      await sheets.spreadsheets.values.get({

        auth: authClient,

        spreadsheetId:
          salesOrderSpreadsheetId,

        range:
          `${SHEET_NAMES.SALES_MASTER}!A:P`,

      });


    const rows =
      response.data.values ||
      [];


    const index =
      rows.findIndex(

        (row, i) =>

          i > 0 &&
          row[0] === soNo

      );


    if (
      index === -1
    ) {

      throw new Error(
        "Sales Order Not Found"
      );

    }


    const rowNumber =
      index + 1;


    // IMPORTANT:
    // Status column is O
    // because A:P structure:
    //
    // A SO No
    // B Date
    // C Customer
    // D Product
    // E Division
    // F Qty
    // G Rate
    // H Unit
    // I Opening FG Qty
    // J Production Qty
    // K Job Work
    // L Manufactured Qty
    // M Dispatched Qty
    // N Order Received By
    // O Overall Status
    // P Location


    await sheets.spreadsheets.values.update({

      auth: authClient,

      spreadsheetId:
        salesOrderSpreadsheetId,

      range:
        `${SHEET_NAMES.SALES_MASTER}!O${rowNumber}`,

      valueInputOption:
        "USER_ENTERED",

      requestBody: {

        values: [

          [
            "Cancelled"
          ]

        ],

      },

    });


    return true;

  };