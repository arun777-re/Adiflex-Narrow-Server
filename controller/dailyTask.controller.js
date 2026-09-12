import {
  getAllDailyTasks,
  createDailyTask,
  updateDailyTask,
  completeDailyTaskService,
} from "../services/dailyTask.service.js";
import { getDailyTaskLogs } from "../utils/dailyTask.utils.js";

// =========================================================
// GET ALL DAILY TASKS
// =========================================================

export const getDailyTasks = async (req, res) => {
  try {
    const tasks = await getAllDailyTasks();

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error("getDailyTasks controller error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get daily tasks",
    });
  }
};

// =========================================================
// CREATE DAILY TASK
// =========================================================

export const createTask = async (req, res) => {
  try {
    console.log("create task req payload..", req.body);
    const task = await createDailyTask(req.body);

    return res.status(201).json({
      success: true,
      message: "Daily task created successfully",
      data: task,
    });
  } catch (error) {
    console.error("createTask controller error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create daily task",
    });
  }
};

// =========================================================
// UPDATE DAILY TASK
// =========================================================

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const result = await updateDailyTask(taskId, req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("updateTask controller error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update daily task",
    });
  }
};

// employe side controllers
export const getDailyTaskForEmployee = async (req, res) => {
  try {
    const { userID } = req.query;

    if (!userID) {
      return res.status(400).json({
        success: false,
        message: "Please provide proper user details",
        data: [],
      });
    }
    const allTasks = await getAllDailyTasks();

    const employeeTasks = allTasks.filter((user) => user.assignedTo === userID);

    if (employeeTasks.length <= 0) {
      return res.json({
        success: true,
        message: "No Daily Task found for the employee",
        status: 200,
        data: [],
      });
    }

    return res.json({
      success: true,
      message: "Daily Tasks Assigned to the Employees are:",
      status: 200,
      data: employeeTasks,
      taskLength: employeeTasks.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// EMPLOYEE COMPLETE DAILY TASKS
export const completeDailyTask = async (req, res) => {
  try {
    const { taskId, userID } = req.body;

    // =========================================
    // VALIDATION
    // =========================================

    if (!taskId || !userID) {
      return res.status(400).json({
        success: false,
        message: "taskId and userID are required",
      });
    }

    // =========================================
    // COMPLETE TASK
    // =========================================

    const result = await completeDailyTaskService({
      taskId,
      userID,
    });

    // =========================================
    // SUCCESS
    // =========================================

    return res.status(200).json({
      success: true,
      message: "Daily task completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ completeDailyTask controller error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// get weekly performance of employees
export const getWeeklyPerformanceOfEmployee = async (req, res) => {
  try {
    const { userID, startDate, endDate } = req.query;

    // =========================================================
    // 1. VALIDATION
    // =========================================================

    if (!userID || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "userID, startDate and endDate are required",
      });
    }

    // =========================================================
    // 2. GET DAILY TASK LOGS
    // =========================================================

    const dailyTaskLogs = await getDailyTaskLogs();

    if (!dailyTaskLogs || dailyTaskLogs.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          userID,
          startDate,
          endDate,
          summary: {
            assigned: 0,
            completed: 0,
            pending: 0,
            onTime: 0,
            late: 0,
            score: 0,
          },
          logs: [],
        },
      });
    }

    // =========================================================
    // 3. FILTER EMPLOYEE + DATE RANGE
    // =========================================================

    const employeeLogs = dailyTaskLogs.filter((log) => {
      const logUserID = String(log.userID || "").trim();

      const logDate = String(log.taskDate || "").trim();

      return (
        logUserID === String(userID).trim() &&
        logDate >= startDate &&
        logDate <= endDate
      );
    });

    // =========================================================
    // 4. BASIC PERFORMANCE COUNTS
    // =========================================================

    const assigned = employeeLogs.length;

    const completedLogs = employeeLogs.filter(
      (log) =>
        String(log.status || "").toUpperCase() === "COMPLETED"
    );

    const completed = completedLogs.length;

    const pending = assigned - completed;

    // =========================================================
    // 5. RESPONSE
    // =========================================================

    return res.status(200).json({
      success: true,

      data: {
        userID,
        startDate,
        endDate,

        summary: {
          assigned,
          completed,
          pending,
          onTime: 0,
          late: 0,
          score: 0,
        },

        logs: employeeLogs,
      },
    });
  } catch (error) {
    console.error("getWeeklyPerformanceOfEmployee error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
