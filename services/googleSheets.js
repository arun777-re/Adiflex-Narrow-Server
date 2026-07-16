import sheets from "../config/db.js";

const spreadsheetId = process.env.GOOGLE_SHEET_ID;

export const getUsers = async () => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Users!A:E",
    });

    return response.data.values || [];
  } catch (error) {
  console.error("FULL ERROR:");
  console.error(error);
  throw error;
}
};