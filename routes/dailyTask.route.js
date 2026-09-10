import express from "express";

import {
  getDailyTasks,
  createTask,
  updateTask,
  getDailyTaskForEmployee,
  completeDailyTask,
} from "../controller/dailyTask.controller.js";

const router = express.Router();


// GET all recurring tasks
router.get("/get", getDailyTasks);


// CREATE recurring task
router.post("/create", createTask);


// UPDATE recurring task
router.patch("/update/:taskId", updateTask);


// employe routes 
router.get('/employee-gettasks',getDailyTaskForEmployee);
router.post('/complete-task',completeDailyTask)


export default router;