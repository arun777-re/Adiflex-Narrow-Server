import express, { Router } from 'express';
import { completeDelegationTask, createDelegationTask, getActiveDelegationTasks, lateTaskResponse } from '../controller/delegationController.js';


const router = express.Router();

router.post('/create',createDelegationTask);
router.get('/get-active',getActiveDelegationTasks);
router.patch('/complete/:taskID',completeDelegationTask);
router.patch('/not-completed',lateTaskResponse);
  

export default router;