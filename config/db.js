import dotenv from 'dotenv';
dotenv.config();
import { google } from "googleapis";


export const DATABASES = {
  SALES_ORDER:process.env.GOOGLE_SHEET_ID,
  WOVEN:process.env.WOVEN_DATABASE_ID,
  CROCHET:process.env.CROCHET_DATABASE_ID,
};

export const auth = new google.auth.GoogleAuth({
  keyFile: "config/credentials.json",
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
  const spreadsheetID= DATABASES[normalizedDivision];
  if(!spreadsheetID){
    throw new Error(`No database configured for division:${division}`);
  }

  return spreadsheetID;
}

// update cell function
export const updateCell = async ({
  division,
  spreadsheetId,
  sheetName = "Production_Process",
  range,
  value,
}) => {

  const SPREADSHEET_ID =
    spreadsheetId || getDatabaseByDivision(division);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[value]],
    },
  });

};


export const appendCell = async ({
  division,
  spreadsheetId,
  sheetName,
  range,
  value,
}) => {
  try {

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [value],
      },
    });

    console.log("✅ Row appended:", {
      sheetName,
      range,
    });

  } catch (error) {
    console.error("❌ appendCell Error:", error);

    throw error;
  }
};

export const getCurrentDateTime = () => {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}:${get("second")} ${get("dayPeriod").toUpperCase()}`;
};