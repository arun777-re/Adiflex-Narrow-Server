import sheets from '../config/db.js'
import { SHEET_NAMES } from '../constants/sheetNames.js';


// =========================================================
// DAILY TASKS - GET ALL
// =========================================================

const cache = new Map();

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

const SPREADSHEET_ID = process.env.DAILY_TASK_SHEET_ID;

export const getDailyTasks = async () => {
  try {
    const cacheKey = "daily_tasks";

    const cached = cache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.timestamp < CACHE_TTL
    ) {
      console.log("⚡ DAILY_TASKS CACHE HIT");
      return cached.data;
    }

    console.log("📊 DAILY_TASKS GOOGLE SHEET FETCH");

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.DAILY_TASK_SHEET}!A:K`,
    });

    const data = response.data.values || [];

    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error("getDailyTasks error:", error);
    throw error;
  }
};


// =========================================================
// DAILY TASKS - APPEND
// =========================================================

export const appendDailyTask = async (row) => {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.DAILY_TASKS}!A:K`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    });
  } catch (error) {
    console.error("appendDailyTask error:", error);
    throw error;
  }
};


// =========================================================
// DAILY TASKS - BATCH UPDATE CELLS
// =========================================================

export const updateDailyTaskCellsBatch = async ({
  rowNumber,
  updates,
}) => {
  try {
    if (!updates?.length) return;

    const data = updates.map(([columnLetter, value]) => ({
      range: `${SHEET_NAMES.DAILY_TASKS}!${columnLetter}${rowNumber}`,
      values: [[value]],
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data,
      },
    });
  } catch (error) {
    console.error("updateDailyTaskCellsBatch error:", error);
    throw error;
  }
};