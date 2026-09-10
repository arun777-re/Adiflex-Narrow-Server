import sheets from '../config/db.js'
import { DAILY_TASK_LOG_COLUMNS } from '../constants/dailyTask.constant.js';
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
      range: `${SHEET_NAMES.DAILY_TASK_SHEET}!A:L`,
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


export const getDailyTaskLogs = async () => {
  try {
    const cacheKey = "daily_tasks_logs";

    const cached = cache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.timestamp < CACHE_TTL
    ) {
      console.log("⚡ DAILY_TASK_LOGS CACHE HIT");
      return cached.data;
    }

    console.log("📊 DAILY_TASK_LOGS GOOGLE SHEET FETCH");

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.DAILY_TASK_LOG_SHEET}!A:H`,
    });

    const rows = response.data.values || [];

    // Header remove + empty rows remove
    const data = rows
      .slice(1)
      .filter((row) =>
        row && row.some((cell) => String(cell || "").trim() !== "")
      )
      .map((row) => ({
        logId: row[DAILY_TASK_LOG_COLUMNS.LOG_ID] || "",
        taskId: row[DAILY_TASK_LOG_COLUMNS.TASK_ID] || "",
        userID: row[DAILY_TASK_LOG_COLUMNS.USER_ID] || "",
        taskDate: row[DAILY_TASK_LOG_COLUMNS.TASK_DATE] || "",
        taskType: row[DAILY_TASK_LOG_COLUMNS.TASK_TYPE] || "",
        assignedTo: row[DAILY_TASK_LOG_COLUMNS.ASSIGNED_TO] || "",
        status: row[DAILY_TASK_LOG_COLUMNS.STATUS] || "",
        completedAt: row[DAILY_TASK_LOG_COLUMNS.COMPLETED_AT] || "",
      }));

    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error("getDailyTaskLogs error:", error);
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
      range: `${SHEET_NAMES.DAILY_TASK_SHEET}!A:L`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    });
    cache.clear();
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
      range: `${SHEET_NAMES.DAILY_TASK_SHEET}!${columnLetter}${rowNumber}`,
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


export const appendDailyTaskLog = async (newRow) => {
  try {
    if (!Array.isArray(newRow) || newRow.length !== 8) {
      throw new Error(
        "Daily task log row must contain exactly 8 columns"
      );
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId:SPREADSHEET_ID,
      range: `${SHEET_NAMES.DAILY_TASK_LOG_SHEET}!A:H`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [newRow],
      },
    });

    console.log("✅ Daily task log added successfully");

    return true;
  } catch (error) {
    console.error(
      "❌ appendDailyTaskLog error:",
      error
    );

    throw error;
  }
};


export const normalizeTaskDate = (value) => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  const datePart = raw.split(" ")[0];

  // DD-MM-YYYY -> YYYY-MM-DD
  if (/^\d{2}-\d{2}-\d{4}$/.test(datePart)) {
    const [day, month, year] = datePart.split("-");
    return `${year}-${month}-${day}`;
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  return datePart;
};