import express from "express";
import { login,getAllUsers } from "../controller/authController.js";

const router = express.Router();

router.post("/login", login);
router.get('/all-users',getAllUsers);

export default router;