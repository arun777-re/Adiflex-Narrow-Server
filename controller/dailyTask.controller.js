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

// =========================================================
// GET WEEKLY PERFORMANCE OF EMPLOYEE
// =========================================================
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

    const normalizedUserID = String(userID).trim();

    // =========================================================
    // 2. NORMALIZE DATE
    // =========================================================

    const normalizeDate = (value) => {
      if (!value) return "";

      const date = String(value).trim();

      // Already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }

      // DD-MM-YYYY
      const match = date.match(/^(\d{2})-(\d{2})-(\d{4})/);

      if (match) {
        const [, day, month, year] = match;

        return `${year}-${month}-${day}`;
      }

      // If datetime comes like:
      // 2026-10-01T10:20:30
      if (date.includes("T")) {
        return date.split("T")[0];
      }

      return date.substring(0, 10);
    };

    // =========================================================
    // 3. GET ALL FIXED DAILY TASKS
    // =========================================================

    const allTasks = await getAllDailyTasks();

    // Only tasks assigned to this employee
    const employeeTasks = (allTasks || []).filter((task) => {
      const assignedTo = String(
        task.assignedTo ??
          task.ASSIGNED_TO ??
          task.userID ??
          task.USER_ID ??
          "",
      ).trim();

      return assignedTo === normalizedUserID;
    });

    // =========================================================
    // 4. GET DAILY TASK LOGS
    // =========================================================

    const dailyTaskLogs = await getDailyTaskLogs();

    // =========================================================
    // 5. GENERATE DATE RANGE
    // =========================================================

    const dates = [];

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid startDate or endDate",
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "startDate cannot be greater than endDate",
      });
    }

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
    // 6. FILTER EMPLOYEE LOGS
    // =========================================================

    const employeeLogs = (dailyTaskLogs || []).filter((log) => {
      const logUserID = String(
        log.userID ?? log.USER_ID ?? log.assignedTo ?? log.ASSIGNED_TO ?? "",
      ).trim();

      const logDate = normalizeDate(
        log.taskDate ?? log.TASK_DATE ?? log.date ?? log.DATE ?? "",
      );

      return (
        logUserID === normalizedUserID &&
        logDate >= startDate &&
        logDate <= endDate
      );
    });

    // =========================================================
    // 7. CREATE LOG LOOKUP
    //
    // KEY:
    //
    // TASK_ID + DATE
    //
    // Example:
    //
    // TSK0022_2026-10-01
    //
    // If multiple logs exist for same task/date,
    // COMPLETED always wins.
    // =========================================================

    const logMap = new Map();

    employeeLogs.forEach((log) => {
      const taskID = String(
        log.taskID ?? log.TASK_ID ?? log.taskId ?? "",
      ).trim();

      const taskDate = normalizeDate(log.taskDate ?? log.TASK_DATE ?? "");

      if (!taskID || !taskDate) {
        return;
      }

      const key = `${taskID}_${taskDate}`;

      const status = String(log.status ?? log.STATUS ?? "")
        .trim()
        .toUpperCase();

      const existingLog = logMap.get(key);

      // =======================================================
      // IF ANY LOG IS COMPLETED,
      // KEEP IT AS COMPLETED
      // =======================================================

      if (status === "COMPLETED") {
        logMap.set(key, {
          ...log,
          status: "COMPLETED",
          normalizedDate: taskDate,
        });

        return;
      }

      // If no previous log exists, store current log
      if (!existingLog) {
        logMap.set(key, {
          ...log,
          status,
          normalizedDate: taskDate,
        });
      }
    });

    // =========================================================
    // 8. CREATE EXPECTED DAILY TASK OCCURRENCES
    //
    // Fixed tasks × selected dates
    //
    // Example:
    //
    // 3 tasks
    // 7 days
    //
    // assigned = 21
    // =========================================================

    const assignedTaskOccurrences = [];

    dates.forEach((taskDate) => {
      employeeTasks.forEach((task) => {
        const taskID = String(
          task.taskId ?? task.taskID ?? task.TASK_ID ?? "",
        ).trim();

        const taskName = String(
          task.description ??
            task.taskName ??
            task.task_name ??
            task.TASK_NAME ??
            task.DESCRIPTION ??
            "",
        ).trim();

        const assignedTo = String(
          task.assignedTo ??
            task.ASSIGNED_TO ??
            task.userID ??
            task.USER_ID ??
            normalizedUserID,
        ).trim();

        const department = String(
          task.department ?? task.DEPARTMENT ?? "",
        ).trim();

        // Don't create invalid task occurrence
        if (!taskID) {
          return;
        }

        assignedTaskOccurrences.push({
          taskID,
          taskName,
          assignedTo,
          taskDate,
          department,
        });
      });
    });

    // =========================================================
    // 9. CHECK EACH TASK AGAINST LOGS
    // =========================================================

    const performanceLogs = assignedTaskOccurrences.map((task) => {
      const key = `${task.taskID}_${task.taskDate}`;

      const log = logMap.get(key);

      const status = String(log?.status ?? log?.STATUS ?? "")
        .trim()
        .toUpperCase();

      const completed = status === "COMPLETED";

      return {
        taskID: task.taskID,
        taskName: task.taskName,
        taskDate: task.taskDate,
        assignedTo: task.assignedTo,
        department: task.department,

        status: completed ? "COMPLETED" : "NOT_COMPLETED",

        completedAt: log?.completedAt ?? log?.COMPLETED_AT ?? null,
      };
    });

    // =========================================================
    // 10. PERFORMANCE COUNTS
    // =========================================================

    const assigned = performanceLogs.length;

    const completed = performanceLogs.filter(
      (task) => task.status === "COMPLETED",
    ).length;

    const pending = performanceLogs.filter(
      (task) => task.status === "NOT_COMPLETED",
    ).length;

    const completionPercentage =
      assigned > 0 ? Number(((completed / assigned) * 100).toFixed(2)) : 0;

    const score = completionPercentage;

    // =========================================================
    // 11. PENDING TASKS
    // =========================================================

    const pendingTasks = performanceLogs.filter(
      (task) => task.status === "NOT_COMPLETED",
    );

    // =========================================================
    // 12. FINAL RESPONSE
    // =========================================================

    return res.status(200).json({
      success: true,

      data: {
        userID: normalizedUserID,
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
