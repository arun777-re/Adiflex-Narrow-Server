import express, { Router } from 'express';
import { completeDailyTask, getAllActiveDelegationTask } from '../controller/sql/daily_task.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = express.Router();

router.get('/get-active',authMiddleware,getAllActiveDelegationTask);
router.patch('/complete/:taskID',authMiddleware,completeDailyTask);
// router.patch('/not-completed',lateTaskResponse);
  

export default router;