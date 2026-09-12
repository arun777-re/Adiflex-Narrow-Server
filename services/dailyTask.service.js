import {
  getDailyTasks,
  appendDailyTask,
  updateDailyTaskCellsBatch,
  appendDailyTaskLog,
  getDailyTaskLogs,
  normalizeTaskDate
} from "../utils/dailyTask.utils.js";

import {
  DAILY_TASK_COLUMNS,
  DAILY_TASK_COLUMN_LETTERS,
} from "../constants/dailyTask.constant.js";
import { getCurrentDateTime } from "../config/db.js";
import { getFromCache,setCache,clearCache } from "./product.cache.service.js";

const completionLocks = new Map();


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
      taskType = "DAILY",
      description = "",
      assignedTo,
      assignedBy="ADMIN",
      department = "",
      taskOrder = "",
      priority = "",
      dueTime = "",
      active = true,
    } = taskData;

    // =========================================================
    // 1. VALIDATION
    // =========================================================

    if (!description || !assignedTo) {
      throw new Error(
        "description, assignedTo are required"
      );
    }

    const allowedTaskTypes = ["DAILY", "DELEGATION"];

    if (!allowedTaskTypes.includes(taskType)) {
      throw new Error(
        "Invalid taskType. Allowed values: DAILY, DELEGATION"
      );
    }

    // =========================================================
    // 2. GET EXISTING TASKS
    // =========================================================

    const existingTasks = await getDailyTasks();

    const taskRows = existingTasks.slice(1);

    // =========================================================
    // 3. GENERATE NEXT TASK ID
    // =========================================================

    const taskNumbers = taskRows
      .map((row) => {
        const id = row[DAILY_TASK_COLUMNS.TASK_ID];

        if (!id) return 0;

        const match = String(id).match(/TSK(\d+)/);

        return match ? Number(match[1]) : 0;
      })
      .filter(Boolean);

    const nextNumber =
      taskNumbers.length > 0
        ? Math.max(...taskNumbers) + 1
        : 1;

    const taskId = `TSK${String(nextNumber).padStart(4, "0")}`;

    // =========================================================
    // 4. TIMESTAMP
    // =========================================================

    const now = getCurrentDateTime();

    // =========================================================
    // 5. NEW ROW
    // =========================================================

    const newRow = [
      taskId,        // A TASK_ID
      taskType,      // B TASK_TYPE
      description,   // C DESCRIPTION
      assignedTo,    // D ASSIGNED_TO
      assignedBy,    // E ASSIGNED_BY
      department,    // F DEPARTMENT
      taskOrder,     // G TASK_ORDER
      priority,      // H PRIORITY
      dueTime,       // I DUE_TIME
      active,        // J ACTIVE
      now,           // K CREATED_AT
      now,           // L UPDATED_AT
    ];

    await appendDailyTask(newRow);

    // =========================================================
    // 6. RETURN CREATED TASK
    // =========================================================

    return {
      taskId,
      taskType,
      description,
      assignedTo,
      assignedBy,
      department,
      taskOrder,
      priority,
      dueTime,
      active,
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


// =========================================================
// COMPLETE DAILY TASK SERVICE FOR EMPLOYEES
// =========================================================
export const completeDailyTaskService = async ({
  taskId,
  userID,
}) => {
  const now = getCurrentDateTime();
  const taskDate = normalizeTaskDate(now);

  const cleanTaskId = String(taskId || "").trim();
  const cleanUserID = String(userID || "").trim();

  if (!cleanTaskId || !cleanUserID) {
    throw new Error("taskId and userID are required");
  }

  // =========================================================
  // UNIQUE LOCK
  // TASK + USER + DATE
  // =========================================================

  const lockKey = `${cleanTaskId}_${cleanUserID}_${taskDate}`;

  // =========================================================
  // 1. BLOCK SIMULTANEOUS REQUESTS
  // =========================================================

  if (completionLocks.has(lockKey)) {
    throw new Error(
      "This task is already being completed. Please wait."
    );
  }

  completionLocks.set(lockKey, true);

  try {
    // =======================================================
    // 2. GET TASK
    // =======================================================

    const allTasks = await getAllDailyTasks();

    const task = allTasks.find(
      (item) =>
        String(item.taskId || "").trim() === cleanTaskId
    );

    if (!task) {
      throw new Error("Daily task not found");
    }

    // =======================================================
    // 3. VERIFY ASSIGNMENT
    // =======================================================

    if (
      String(task.assignedTo || "").trim() !==
      cleanUserID
    ) {
      throw new Error(
        "This task is not assigned to this employee"
      );
    }

    // =======================================================
    // 4. VERIFY ACTIVE
    // =======================================================

    if (task.active !== true) {
      throw new Error("This task is inactive");
    }

    // =======================================================
    // 5. IMPORTANT:
    // FORCE FRESH LOG DATA
    //
    // Do NOT allow an old cached log list here.
    // Otherwise second click can create duplicate logs.
    // =======================================================

    clearCache("daily_tasks_logs");

    const allLogs = await getDailyTaskLogs();

    // =======================================================
    // 6. CHECK ALREADY COMPLETED TODAY
    // =======================================================

    const alreadyCompleted = allLogs.some((log) => {
      const logTaskId = String(log.taskId || "").trim();

      const logUserId = String(log.userID || "").trim();

      const logDate = normalizeTaskDate(log.taskDate);

      const logStatus = String(log.status || "")
        .trim()
        .toUpperCase();

      return (
        logTaskId === cleanTaskId &&
        logUserId === cleanUserID &&
        logDate === taskDate &&
        logStatus === "COMPLETED"
      );
    });

    // =======================================================
    // 7. STOP DUPLICATE COMPLETION
    // =======================================================

    if (alreadyCompleted) {
      throw new Error(
        "This task is already completed for today"
      );
    }

    // =======================================================
    // 8. GENERATE NEXT LOG ID
    // =======================================================

    const logNumbers = allLogs
      .map((log) => {
        const match = String(log.logId || "").match(
          /^LOG(\d+)$/
        );

        return match ? Number(match[1]) : 0;
      })
      .filter((number) => number > 0);

    const nextNumber =
      logNumbers.length > 0
        ? Math.max(...logNumbers) + 1
        : 1;

    const logId = `LOG${String(nextNumber).padStart(4, "0")}`;

    // =======================================================
    // 9. CREATE LOG ROW
    // =======================================================

    const newLogRow = [
      logId,
      task.taskId,
      cleanUserID,
      taskDate,
      task.taskType || "",
      task.assignedTo,
      "COMPLETED",
      now,
    ];

    // =======================================================
    // 10. SAVE TO GOOGLE SHEET
    // =======================================================

    await appendDailyTaskLog(newLogRow);

    // =======================================================
    // 11. CLEAR CACHE AGAIN
    // =======================================================

    clearCache("daily_tasks_logs");

    // =======================================================
    // 12. RETURN SUCCESS
    // =======================================================

    return {
      logId,
      taskId: task.taskId,
      userID: cleanUserID,
      taskDate,
      taskType: task.taskType || "",
      assignedTo: task.assignedTo,
      status: "COMPLETED",
      completedAt: now,
    };

  } catch (error) {
    console.error(
      "❌ completeDailyTaskService error:",
      error
    );

    throw error;

  } finally {
    // =======================================================
    // 13. ALWAYS RELEASE LOCK
    // =======================================================

    completionLocks.delete(lockKey);
  }
};

