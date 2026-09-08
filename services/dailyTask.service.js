import {
  getDailyTasks,
  appendDailyTask,
  updateDailyTaskCellsBatch,
} from "../utils/dailyTask.utils.js";

import {
  DAILY_TASK_COLUMNS,
  DAILY_TASK_COLUMN_LETTERS,
} from "../constants/dailyTask.constant.js";
import { getCurrentDateTime } from "../config/db.js";




// =========================================================
// GET ALL DAILY TASKS
// =========================================================

export const getAllDailyTasks = async () => {
  try {
    const rows = await getDailyTasks();

    if (!rows || rows.length <= 1) {
      return [];
    }

    return rows.slice(1).map((row) => ({
      taskId: row[DAILY_TASK_COLUMNS.TASK_ID] || "",
      taskName: row[DAILY_TASK_COLUMNS.TASK_NAME] || "",
      description: row[DAILY_TASK_COLUMNS.DESCRIPTION] || "",
      assignedTo: row[DAILY_TASK_COLUMNS.ASSIGNED_TO] || "",
      assignedBy: row[DAILY_TASK_COLUMNS.ASSIGNED_BY] || "",
      department: row[DAILY_TASK_COLUMNS.DEPARTMENT] || "",
      priority: row[DAILY_TASK_COLUMNS.PRIORITY] || "",
      dueTime: row[DAILY_TASK_COLUMNS.DUE_TIME] || "",
      active: row[DAILY_TASK_COLUMNS.ACTIVE] === true ||
              row[DAILY_TASK_COLUMNS.ACTIVE] === "TRUE",
      createdAt: row[DAILY_TASK_COLUMNS.CREATED_AT] || "",
      updatedAt: row[DAILY_TASK_COLUMNS.UPDATED_AT] || "",
    }));
  } catch (error) {
    console.error("getAllDailyTasks error:", error);
    throw error;
  }
};

export const createDailyTask = async (taskData) => {
  try {
    const {
      taskName,
      taskType = "DAILY",
      description = "",
      assignedTo,
      assignedBy,
      department = "",
      priority = "Medium",
      dueTime = "",
    } = taskData;

    // =========================================================
    // VALIDATION
    // =========================================================

    if (!taskName || !assignedTo || !assignedBy) {
      throw new Error(
        "taskName, assignedTo and assignedBy are required"
      );
    }

    // =========================================================
    // VALID TASK TYPE
    // =========================================================

    const allowedTaskTypes = ["DAILY", "DELEGATION"];

    if (!allowedTaskTypes.includes(taskType)) {
      throw new Error(
        "Invalid taskType. Allowed values: DAILY, DELEGATION"
      );
    }

    // =========================================================
    // GET EXISTING TASKS
    // =========================================================

    const existingTasks = await getDailyTasks();

    const taskRows = existingTasks.slice(1);

    // =========================================================
    // GENERATE NEXT TASK ID
    // =========================================================

    const taskNumbers = taskRows
      .map((row) => {
        const id = row[DAILY_TASK_COLUMNS.TASK_ID];

        if (!id) return 0;

        const match = String(id).match(/TASK(\d+)/);

        return match ? Number(match[1]) : 0;
      })
      .filter(Boolean);

    const nextNumber =
      taskNumbers.length > 0
        ? Math.max(...taskNumbers) + 1
        : 1;

    const taskId = `TASK${String(nextNumber).padStart(4, "0")}`;

    // =========================================================
    // TIMESTAMP
    // =========================================================

    const now = getCurrentDateTime();

    // =========================================================
    // NEW ROW
    // =========================================================
    // A  TASK_ID
    // B  TASK_NAME
    // C  TASK_TYPE
    // D  DESCRIPTION
    // E  ASSIGNED_TO
    // F  ASSIGNED_BY
    // G  DEPARTMENT
    // H  PRIORITY
    // I  DUE_TIME
    // J  ACTIVE
    // K  CREATED_AT
    // L  UPDATED_AT

    const newRow = [
      taskId,
      taskName,
      taskType,
      description,
      assignedTo,
      assignedBy,
      department,
      priority,
      dueTime,
      true,
      now,
      now,
    ];

    // =========================================================
    // SAVE TO GOOGLE SHEET
    // =========================================================

    await appendDailyTask(newRow);

    // =========================================================
    // RETURN CREATED TASK
    // =========================================================

    return {
      taskId,
      taskName,
      taskType,
      description,
      assignedTo,
      assignedBy,
      department,
      priority,
      dueTime,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

  } catch (error) {
    console.error("createDailyTask error:", error);
    throw error;
  }
};

export const updateDailyTask = async (taskId, updates) => {
  try {
    const rows = await getDailyTasks();

    if (!rows || rows.length <= 1) {
      throw new Error("No daily tasks found");
    }

    const rowIndex = rows.findIndex(
      (row, index) =>
        index > 0 &&
        String(row[DAILY_TASK_COLUMNS.TASK_ID]).trim() ===
          String(taskId).trim()
    );

    if (rowIndex === -1) {
      throw new Error(`Task ${taskId} not found`);
    }

    const rowNumber = rowIndex + 1;

    const allowedFields = {
      taskName: DAILY_TASK_COLUMN_LETTERS.TASK_NAME,
      description: DAILY_TASK_COLUMN_LETTERS.DESCRIPTION,
      assignedTo: DAILY_TASK_COLUMN_LETTERS.ASSIGNED_TO,
      assignedBy: DAILY_TASK_COLUMN_LETTERS.ASSIGNED_BY,
      department: DAILY_TASK_COLUMN_LETTERS.DEPARTMENT,
      priority: DAILY_TASK_COLUMN_LETTERS.PRIORITY,
      dueTime: DAILY_TASK_COLUMN_LETTERS.DUE_TIME,
      active: DAILY_TASK_COLUMN_LETTERS.ACTIVE,
    };

    const sheetUpdates = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (
        allowedFields[key] &&
        value !== undefined
      ) {
        sheetUpdates.push([
          allowedFields[key],
          value,
        ]);
      }
    });

    if (!sheetUpdates.length) {
      throw new Error("No valid fields to update");
    }

    sheetUpdates.push([
      DAILY_TASK_COLUMN_LETTERS.UPDATED_AT,
      new Date().toISOString(),
    ]);

    await updateDailyTaskCellsBatch({
      rowNumber,
      updates: sheetUpdates,
    });

    return {
      taskId,
      message: "Daily task updated successfully",
    };
  } catch (error) {
    console.error("updateDailyTask error:", error);
    throw error;
  }
};