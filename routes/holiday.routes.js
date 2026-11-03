
import express from 'express';
import { createHoliday, deleteHoliday, getAllHolidays } from '../controller/sql/holiday.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = express.Router();


router.get('/',authMiddleware,getAllHolidays);
router.post('/create',authMiddleware,createHoliday);
router.delete('/delete/:holiday_id',authMiddleware,deleteHoliday);


export default router;