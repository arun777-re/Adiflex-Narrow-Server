import {createUser,login,updateUser,deleteUser, getAllUsers} from '../controller/sql/auth.controller.js';
import {authMiddleware,requireAdmin} from '../middleware/auth.middleware.js';

import { Router } from 'express';


const router = Router();

router.post('/login',login);

router.delete('/delete',authMiddleware,requireAdmin,deleteUser);

router.patch('/update',authMiddleware,requireAdmin,updateUser);

router.post('/create',authMiddleware,requireAdmin,createUser);
router.get('/all-users',authMiddleware,requireAdmin,getAllUsers);

export default router;

