import sheets from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

export const getAllActivityBasedOnDate = async (date) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.NOTIFICATION_SHEET_ID,
      range: `${SHEET_NAMES.NOTIFICATIONS}!A:Z`,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return [];
    }

    // First row = headers
    const headers = rows[0];

    const data = rows.slice(1).map((row) => {
      const obj = {};

      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });

      return obj;
    });

    // Date nahi di gayi hai to saari activities return
    if (!date) {
      return data;
    }

    // Request date ko normalize karo
    // Example: 28/8/2026 -> 28/08/2026
    const [day, month, year] = date.split("/");

    const requestedDate = `${day.padStart(2, "0")}/${month.padStart(
      2,
      "0"
    )}/${year}`;

    // Created At ke basis par filter
    const filteredActivities = data.filter((activity) => {
      const createdAt = activity["Created At"];

      if (!createdAt) {
        return false;
      }

      const createdDate = new Date(createdAt);

      if (isNaN(createdDate.getTime())) {
        return false;
      }

      // Created At:
      // 2026-08-03T09:20:08.888Z
      //
      // Convert to:
      // 03/08/2026

      const day = String(createdDate.getUTCDate()).padStart(2, "0");
      const month = String(createdDate.getUTCMonth() + 1).padStart(2, "0");
      const year = createdDate.getUTCFullYear();

      const activityDate = `${day}/${month}/${year}`;

      return activityDate === requestedDate;
    });

    return filteredActivities;
  } catch (error) {
    console.error("Error fetching activities based on date:", error);
    throw error;
  }
};