import { getCurrentDateTime, updateCell } from "../config/db.js";
import { DELEGATION_COLUMNS, DELEGATION_COLUMNS_LETTER } from "../constants/delegationColumns.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";
import {
  appendDelegation,
  getDelegations,
  mapDelegationSheet,
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

    const allDelegationTasks = mapDelegationSheet({rows:allDelegationTasksRaw})

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
    const { taskID } = req.params;
    const { userID } = req.query;

    if (!taskID) {
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
      taskID,
      userID,
    });

    // Get all delegation tasks
    const delegationsRaw = await getDelegations();

    if (!Array.isArray(delegationsRaw) || delegationsRaw.length < 2) {
      return res.status(404).json({
        success: false,
        message: "No delegation tasks found",
      });
    }

    const mappedData = mapDelegationSheet({rows:delegationsRaw});
    console.log("MAPPEDDATA:",mappedData)

    const rowIndex = mappedData.findIndex((row)=>String(row.taskID).trim() === String(taskID).trim() && 
    String(row.assignedTo).trim() === String(userID).trim() &&
      String(row.status).toLowerCase() === "pending" )

    if(rowIndex === -1){
      return res.status(404).json({
        success:false,
        message:"Not found"
      });
    } 

    const sheetRow = rowIndex + 2;
    const range = `${DELEGATION_COLUMNS_LETTER.STATUS}${sheetRow}`

    // Update STATUS
    await updateCell({
      spreadsheetId:process.env.DELEGATION_SHEET_ID,
      sheetName:`${SHEET_NAMES.DELEGATION_SHEET}`,
      range,
      value: "Completed",
    });

    console.log("✅ Delegation task completed:", taskID);
    await sendNotification({
      userID:"USER0001",
      role:"admin",
      division:"all",
      type:"new-notification",
      title:`${userID} completed task`,
      message:`${mappedData[rowIndex].description} completed`
    })

    return res.status(200).json({
      success: true,
      message: "Delegation task completed successfully",
      data: {
        taskID,
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
