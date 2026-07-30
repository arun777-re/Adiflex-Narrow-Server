import sheets, { auth } from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

// ==========================================
// GET ALL USERS
// ==========================================

export const getUsers = async () => {

  const authClient = await auth.getClient();

  const response = await sheets.spreadsheets.values.get({

    auth: authClient,

    spreadsheetId: process.env.GOOGLE_SHEET_ID,

    range: SHEET_NAMES.USERS,

  });

  return response.data.values || [];

};