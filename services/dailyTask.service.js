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


// COMPLETE DAILY TASK SERVICE FOR EMPLOYEES
export const completeDailyTaskService = async ({
  taskId,
  userID,
}) => {
  try {
    console.log("\n========================================");
    console.log("🚀 COMPLETE DAILY TASK START");
    console.log("========================================");

    console.log("📥 INPUT taskId:", taskId);
    console.log("📥 INPUT userID:", userID);

    // =========================================================
    // 1. GET ALL TASKS
    // =========================================================

    const allTasks = await getAllDailyTasks();

    console.log("📋 ALL TASKS LENGTH:", allTasks?.length);
    console.log("📋 ALL TASKS:", allTasks);

    const task = allTasks.find(
      (task) =>
        String(task.taskId || "").trim() ===
        String(taskId || "").trim()
    );

    console.log("🎯 FOUND TASK:", task);

    if (!task) {
      console.log("❌ TASK NOT FOUND");
      throw new Error("Daily task not found");
    }

    // =========================================================
    // 2. CHECK TASK ASSIGNMENT
    // =========================================================

    console.log("👤 TASK ASSIGNED TO:", task.assignedTo);
    console.log("👤 CURRENT USER ID:", userID);

    console.log(
      "🔍 ASSIGNMENT MATCH:",
      String(task.assignedTo || "").trim() ===
        String(userID || "").trim()
    );

    if (
      String(task.assignedTo || "").trim() !==
      String(userID || "").trim()
    ) {
      throw new Error(
        "This task is not assigned to this employee"
      );
    }

    // =========================================================
    // 3. CHECK ACTIVE TASK
    // =========================================================

    console.log("🟢 TASK ACTIVE VALUE:", task.active);
    console.log(
      "🟢 TASK ACTIVE TYPE:",
      typeof task.active
    );

    if (task.active !== true) {
      console.log("❌ TASK IS NOT ACTIVE");
      throw new Error("This task is inactive");
    }

    // =========================================================
    // 4. TODAY'S DATE
    // =========================================================

    const now = getCurrentDateTime();

const taskDate = normalizeTaskDate(now);

    console.log("🕐 CURRENT DATETIME:", now);
    console.log("📅 TASK DATE:", taskDate);

    // =========================================================
    // 5. GET EXISTING LOGS
    // =========================================================

    const allLogs = await getDailyTaskLogs();

    console.log("📚 ALL LOGS LENGTH:", allLogs?.length);
    console.log("📚 ALL LOGS:", allLogs);

    // =========================================================
    // 6. FILTER RELEVANT LOGS
    // =========================================================

    const relevantLogs = allLogs.filter((log) => {
      const logTaskId = String(log.taskId || "").trim();
      const logUserID = String(log.userID || "").trim();

      return (
        logTaskId === String(taskId || "").trim() &&
        logUserID === String(userID || "").trim()
      );
    });

    console.log(
      "🔎 RELEVANT LOGS FOR THIS TASK + USER:",
      relevantLogs
    );

    // =========================================================
    // 7. CHECK EACH LOG
    // =========================================================

    relevantLogs.forEach((log, index) => {
      const logTaskDate = String(
        log.taskDate || ""
      )
        .trim()
        .split(" ")[0];

      const logStatus = String(
        log.status || ""
      )
        .trim()
        .toUpperCase();

      console.log(`\n🔍 LOG CHECK #${index + 1}`);

      console.log("   LOG ID:", log.logId);

      console.log(
        "   LOG TASK ID:",
        log.taskId
      );

      console.log(
        "   INPUT TASK ID:",
        taskId
      );

      console.log(
        "   TASK ID MATCH:",
        String(log.taskId || "").trim() ===
          String(taskId || "").trim()
      );

      console.log(
        "   LOG USER ID:",
        log.userID
      );

      console.log(
        "   INPUT USER ID:",
        userID
      );

      console.log(
        "   USER ID MATCH:",
        String(log.userID || "").trim() ===
          String(userID || "").trim()
      );

      console.log(
        "   RAW LOG DATE:",
        log.taskDate
      );

      console.log(
        "   NORMALIZED LOG DATE:",
        logTaskDate
      );

      console.log(
        "   CURRENT TASK DATE:",
        taskDate
      );

      console.log(
        "   DATE MATCH:",
        logTaskDate === taskDate
      );

      console.log(
        "   LOG STATUS:",
        log.status
      );

      console.log(
        "   NORMALIZED STATUS:",
        logStatus
      );

      console.log(
        "   STATUS MATCH:",
        logStatus === "COMPLETED"
      );
    });

    // =========================================================
    // 8. DUPLICATE CHECK
    // =========================================================

 const alreadyCompleted = allLogs.some(
  (log) =>
    log.taskId === taskId &&
    log.userID === userID &&
    normalizeTaskDate(log.taskDate) === taskDate &&
    String(log.status).trim().toUpperCase() === "COMPLETED"
);

    console.log(
      "\n🚨 ALREADY COMPLETED RESULT:",
      alreadyCompleted
    );

    if (alreadyCompleted) {
      console.log(
        "🛑 DUPLICATE COMPLETION BLOCKED"
      );

      throw new Error(
        "This task is already completed for today"
      );
    }

    // =========================================================
    // 9. GENERATE LOG ID
    // =========================================================

    const logNumbers = allLogs
      .map((log) => {
        const id = log.logId;

        if (!id) return 0;

        const match = String(id).match(/LOG(\d+)/);

        return match ? Number(match[1]) : 0;
      })
      .filter(Boolean);

    const nextNumber =
      logNumbers.length > 0
        ? Math.max(...logNumbers) + 1
        : 1;

    const logId = `LOG${String(nextNumber).padStart(
      4,
      "0"
    )}`;

    console.log("🆕 NEW LOG ID:", logId);

    // =========================================================
    // 10. CREATE LOG ROW
    // =========================================================

    const newLogRow = [
      logId,
      task.taskId,
      userID,
      taskDate,
      task.taskType,
      task.assignedTo,
      "COMPLETED",
      now,
    ];

    console.log(
      "📝 NEW LOG ROW:",
      newLogRow
    );

    // =========================================================
    // 11. SAVE LOG
    // =========================================================

    console.log("💾 SAVING LOG...");

    await appendDailyTaskLog(newLogRow);

    console.log("✅ LOG SAVED SUCCESSFULLY");

    // =========================================================
    // 12. RETURN RESULT
    // =========================================================

    const result = {
      logId,
      taskId: task.taskId,
      userID,
      taskDate,
      taskType: task.taskType,
      assignedTo: task.assignedTo,
      status: "COMPLETED",
      completedAt: now,
    };

    console.log("📤 FINAL RESULT:", result);

    console.log("========================================");
    console.log("✅ COMPLETE DAILY TASK END");
    console.log("========================================\n");

    return result;

  } catch (error) {
    console.error(
      "\n❌ completeDailyTaskService error:",
      error
    );

    console.error(
      "❌ ERROR MESSAGE:",
      error.message
    );

    throw error;
  }
};