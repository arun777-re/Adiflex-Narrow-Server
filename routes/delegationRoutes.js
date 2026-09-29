import express, { Router } from 'express';
import { completeDelegationTask, createDelegationTask, getActiveDelegationTasks } from '../controller/delegationController.js';


const router = express.Router();

router.post('/create',createDelegationTask);
router.get('/get-active',getActiveDelegationTasks);
router.patch('/update-delegation',completeDelegationTask)



export default router;