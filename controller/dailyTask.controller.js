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

// get weekly performance of employee
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
    // 2. GET ASSIGNED DAILY TASKS
    // =========================================================

    const allTasks = await getAllDailyTasks();

    const employeeTasks = (allTasks || []).filter(
      (task) => String(task.assignedTo || "").trim() === String(userID).trim(),
    );
  
    // =========================================================
    // 3. GET DAILY TASK LOGS
    // =========================================================

    const dailyTaskLogs = await getDailyTaskLogs();

    // =========================================================
    // 4. GENERATE DATE RANGE
    // =========================================================

    const dates = [];

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      dates.push(`${year}-${month}-${day}`);
    }

    // =========================================================
    // 5. FILTER EMPLOYEE LOGS
    // =========================================================

    const employeeLogs = (dailyTaskLogs || []).filter((log) => {
      const logUserID = String(log.userID || "").trim();
      const logDate = String(log.taskDate || "").trim();

      return (
        logUserID === String(userID).trim() &&
        logDate >= startDate &&
        logDate <= endDate
      );
    });

    // =========================================================
    // 6. CREATE LOG LOOKUP
    // =========================================================

    const logMap = new Map();

    employeeLogs.forEach((log) => {
      const key = `${String(log.taskID || "").trim()}_${String(
        log.taskDate || "",
      ).trim()}`;

      logMap.set(key, log);
    });

    // =========================================================
    // 7. CREATE EXPECTED TASK OCCURRENCES
    // =========================================================

    const assignedTaskOccurrences = [];

    dates.forEach((taskDate) => {
      employeeTasks.forEach((task) => {
        assignedTaskOccurrences.push({
          taskID: task.taskId,
          taskName: task.description,
          assignedTo: task.assignedTo,
          taskDate,
          department:task.department
        });
      });
    });
   
    // =========================================================
    // 8. CHECK COMPLETION
    // =========================================================

    const performanceLogs = assignedTaskOccurrences.map((task) => {
      const key = `${String(task.taskID || "").trim()}_${task.taskDate}`;

      const log = logMap.get(key);

      const status = String(log?.status || "").toUpperCase();

      const completed = status === "COMPLETED";

      return {
        taskID: task.taskID,
        taskName: task.taskName,
        taskDate: task.taskDate,
        assignedTo: task.assignedTo,
        status: completed ? "COMPLETED" : "NOT_COMPLETED",
        completedAt: log?.completedAt || null,
      };
    });

    // =========================================================
    // 9. PERFORMANCE COUNTS
    // =========================================================

    const assigned = performanceLogs.length;

    const completed = performanceLogs.filter(
      (task) => task.status === "COMPLETED",
    ).length;

    const pending = assigned - completed;

    const completionPercentage =
      assigned > 0 ? Number(((completed / assigned) * 100).toFixed(2)) : 0;

    const score = completionPercentage;

    // =========================================================
    // 10. PENDING TASKS
    // =========================================================

    const pendingTasks = performanceLogs.filter(
      (task) => task.status === "NOT_COMPLETED" || task.status === "",
    );

    // =========================================================
    // 11. RESPONSE
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
          completionPercentage,
          score,
        },

        pendingTasks,

        logs: performanceLogs,
      },
    });
  } catch (error) {
    console.error("getWeeklyPerformanceOfEmployee error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
