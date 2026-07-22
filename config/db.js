import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();
import fs from "fs";
import { SHEET_NAMES } from "../constants/sheetNames.js";

export const DATABASES = {
  SALES_ORDER:process.env.GOOGLE_SHEET_ID,
  WOVEN:process.env.WOVEN_DATABASE_ID,
  CROCHET:process.env.CROCHET_DATABASE_ID,
};

export const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});

export default sheets;

// get database by division 
export const getDatabaseByDivision = (division)=>{
  if(!division){
    throw new Error("Division is required");
  }

  const normalizedDivision = String(division).trim().toUpperCase();
   console.log("Normalized:", normalizedDivision);
  console.log("Spreadsheet:", DATABASES[normalizedDivision]);
  const spreadsheetID= DATABASES[normalizedDivision];
  if(!spreadsheetID){
    throw new Error(`No database configured for division:${division}`);
  }

  return spreadsheetID;
}

// update cell function
export const updateCell = async ({
  division,
  range,
  value,
}) => {

  if (!division) {
    throw new Error("Division is required");
  }

  const SPREADSHEET_ID =
    getDatabaseByDivision(division);

  await sheets.spreadsheets.values.update({

    spreadsheetId: SPREADSHEET_ID,

    range: `Production_Process!${range}`,

    valueInputOption: "USER_ENTERED",

    requestBody: {
      values: [[value]],
    },

  });

};