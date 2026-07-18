import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();
import fs from "fs";
import { SHEET_NAMES } from "../constants/sheetNames.js";


export const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});

export default sheets;

export const updateCell = async (cell, value) => {
  const authClient = await auth.getClient();

  await sheets.spreadsheets.values.update({
    auth: authClient,
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAMES.PRODUCTION_SHEET}!${cell}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[value]],
    },
  });
};