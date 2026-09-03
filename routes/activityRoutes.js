import express from 'express';
import { getAllActivities } from '../controller/notification.controller.js';


const router = express.Router();

router.get('/getAll',getAllActivities) 


export default router;