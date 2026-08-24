import sheets, { updateCell } from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

const spreadsheetId = process.env.GOOGLE_SHEET_ID;

export const getUsers = async () => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Users!A:F",
    });

    return response.data.values || [];
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);
    throw error;
  }
};


