import express from "express";
import { getAllTasks,createTask,getTasksByUserId,deleteTask,updateTask, completeDailyTask, getPerformanceOfEmployee, getAllEmployeesPerformance } from "../controller/sql/daily_task.controller.js";
import {authMiddleware,requireAdmin} from '../middleware/auth.middleware.js';
// import {
//   getDailyTasks,
//   createTask,
//   updateTask,
//   getDailyTaskForEmployee,
//   completeDailyTask,
//   getWeeklyPerformanceOfEmployee,
// } from "../controller/dailyTask.controller.js";

const router = express.Router();


// GET all recurring tasks
router.get("/get",authMiddleware,getAllTasks);


// CREATE recurring task
router.post("/create",authMiddleware,requireAdmin,createTask);


// UPDATE recurring task
router.patch("/update/:taskId",authMiddleware,requireAdmin,updateTask);

router.delete("/delete/:taskId",authMiddleware,requireAdmin,deleteTask);


// employe routes 
router.get('/employee-gettasks',authMiddleware,getTasksByUserId);
router.post('/complete-task',authMiddleware,completeDailyTask);

router.get('/get-score',authMiddleware,requireAdmin,getPerformanceOfEmployee);
router.get('/all-employee-performance',authMiddleware,requireAdmin,getAllEmployeesPerformance);


export default router;