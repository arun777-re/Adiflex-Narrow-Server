import {
  getAllDailyTasks,
  createDailyTask,
  updateDailyTask,
} from "../services/dailyTask.service.js";


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

    const result = await updateDailyTask(
      taskId,
      req.body
    );

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