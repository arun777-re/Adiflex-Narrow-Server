import { getCurrentDateTime } from "../config/db.js";
import { DELEGATION_COLUMNS } from "../constants/delegationColumns.js";
import {
  appendDelegation,
  getDelegations,
} from "../helpers/delegationHelper.js";
import { sendNotification } from "../helpers/notificationHelper.js";

// create delegation task
export const createDelegationTask = async (req, res) => {
  try {
    const {
      description,
      assignedBy = "Admin",
      assignedTo,
      dueTime,
      priority,
    } = req.body;
    console.log("incoming request....", req.body);
    // ==========================================
    // VALIDATION
    // ==========================================

    if (!description || !assignedTo || !assignedBy || !dueTime) {
      return res.status(400).json({
        success: false,
        message: "taskName, assignedTo and dueTime are required",
      });
    }

    // ==========================================
    // GET EXISTING DELEGATIONS
    // ==========================================

    const existingDelegations = await getDelegations();

    const delegationRows = existingDelegations.slice(1);

    // ==========================================
    // GENERATE TASK ID
    // DLG0001, DLG0002...
    // ==========================================

    const taskNumbers = delegationRows
      .map((row) => {
        const id = row[DELEGATION_COLUMNS.TASK_ID];

        if (!id) return 0;

        const match = String(id).match(/^DLG(\d+)$/);

        return match ? Number(match[1]) : 0;
      })
      .filter(Boolean);

    const nextNumber =
      taskNumbers.length > 0 ? Math.max(...taskNumbers) + 1 : 1;

    const taskID = `DLG${String(nextNumber).padStart(4, "0")}`;

    // ==========================================
    // CREATE TIMESTAMP
    // ==========================================

    const now = getCurrentDateTime();

    // ==========================================
    // INITIAL STATUS
    // ==========================================

    const status = "Pending";

    const delegationValues = [
      taskID,
      description,
      assignedBy,
      assignedTo,
      now,
      dueTime,
      priority,
      status,
      "",
    ];

    // ==========================================
    // APPEND TO DELEGATIONS SHEET
    // ==========================================

    await appendDelegation(delegationValues);

    // ==========================================
    // SEND NOTIFICATION
    // ==========================================
    await sendNotification({
      userID: assignedTo,
      type: "DELEGATION",
      title: "New Delegation Task",
      message: description,
      reference: taskID,
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,
      message: "Delegation task created successfully",
      data: {
        taskID,
        description,
        assignedBy,
        assignedTo,
        assignedAt: now,
        dueTime,
        status,
        completedAt: "",
      },
    });
  } catch (error) {
    console.error("createDelegationTask error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET ACTIVE DELEGATION TASKS
export const getActiveDelegationTasks = async (req, res) => {
  try {
    const { userID } = req.query;

    if (!userID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    console.log("👤 USER ID:", userID);

    // Get all delegation tasks
    const allDelegationTasksRaw = await getDelegations();
    console.log(allDelegationTasksRaw);

    // Make sure response is an array
    if (
      !Array.isArray(allDelegationTasksRaw) ||
      allDelegationTasksRaw.length < 2
    ) {
      return res.status(200).json({
        success: true,
        message: "No delegation tasks found",
        data: [],
      });
    }

    const headers = allDelegationTasksRaw[0];

    const allDelegationTasks = allDelegationTasksRaw.slice(1).map((row) => {
      return {
        taskID: row[DELEGATION_COLUMNS.TASK_ID],
        description: row[DELEGATION_COLUMNS.TASK_NAME],
        assignedBy: row[DELEGATION_COLUMNS.ASSIGNED_BY],
        assignedTo: row[DELEGATION_COLUMNS.ASSIGNED_TO],
        assignedAt: row[DELEGATION_COLUMNS.ASSIGNED_AT],
        dueTime: row[DELEGATION_COLUMNS.DUE_TIME],
        priority: row[DELEGATION_COLUMNS.PRIORITY],
        status: row[DELEGATION_COLUMNS.STATUS],
      };
    });

    console.log("📦 MAPPED DELEGATION DATA:", allDelegationTasks);

    // Get active tasks assigned to this user
    const userDelegationTasks = allDelegationTasks.filter(
      (task) =>
        String(task.assignedTo).trim() === String(userID).trim() &&
        String(task.status).trim().toLowerCase() === "pending",
    );

    console.log("📋 Active delegation tasks:", userDelegationTasks.length);

    return res.status(200).json({
      success: true,
      message:
        userDelegationTasks.length > 0
          ? "Active delegation tasks fetched successfully"
          : "No active delegation tasks to show",
      data: userDelegationTasks,
    });
  } catch (error) {
    console.error("❌ Get active delegation tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// COMPLETE DELEGATION TASK
export const completeDelegationTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userID } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Task ID is required",
      });
    }

    if (!userID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    console.log("✅ Completing delegation task:", {
      taskId,
      userID,
    });

    // Get all delegation tasks
    const delegations = await getDelegations();

    if (!Array.isArray(delegations) || delegations.length < 2) {
      return res.status(404).json({
        success: false,
        message: "No delegation tasks found",
      });
    }

    // Header row
    const headers = delegations[0];

    // Find column indexes dynamically
    const taskIdIndex = headers.indexOf("TASK_ID");
    const assignedToIndex = headers.indexOf("ASSIGNED_TO");
    const statusIndex = headers.indexOf("STATUS");

    if (
      taskIdIndex === -1 ||
      assignedToIndex === -1 ||
      statusIndex === -1
    ) {
      console.error("❌ Required columns missing:", headers);

      return res.status(500).json({
        success: false,
        message: "Delegation sheet columns are missing",
      });
    }

    // Find task row
    const rowIndex = delegations.findIndex((row, index) => {
      if (index === 0) return false;

      return (
        String(row[taskIdIndex] || "").trim() === String(taskId).trim()
      );
    });

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Delegation task not found",
      });
    }

    const taskRow = delegations[rowIndex];

    // Security: only assigned employee can complete task
    const assignedTo = String(
      taskRow[assignedToIndex] || ""
    ).trim();

    if (assignedTo !== String(userID).trim()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this task",
      });
    }

    // Check current status
    const currentStatus = String(
      taskRow[statusIndex] || ""
    ).trim().toLowerCase();

    if (currentStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Task is already completed",
      });
    }

    // Google Sheet row number
    // +1 because array index 0 = sheet header
    const sheetRowNumber = rowIndex + 1;

    console.log("📌 Sheet row:", sheetRowNumber);
    console.log("📌 STATUS column:", statusIndex + 1);

    // Convert column number to A1 letter
    const getColumnLetter = (columnNumber) => {
      let letter = "";

      while (columnNumber > 0) {
        const remainder = (columnNumber - 1) % 26;

        letter = String.fromCharCode(65 + remainder) + letter;

        columnNumber = Math.floor((columnNumber - 1) / 26);
      }

      return letter;
    };

    const statusColumn = getColumnLetter(statusIndex + 1);

    const range = `Delegation!${statusColumn}${sheetRowNumber}`;

    console.log("📝 Updating:", range);

    // Update STATUS
    await updateCell({
      sheetName: "Delegation",
      range,
      value: "Completed",
    });

    console.log("✅ Delegation task completed:", taskId);

    return res.status(200).json({
      success: true,
      message: "Delegation task completed successfully",
      data: {
        taskId,
        status: "Completed",
      },
    });
  } catch (error) {
    console.error("❌ Complete delegation task error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
