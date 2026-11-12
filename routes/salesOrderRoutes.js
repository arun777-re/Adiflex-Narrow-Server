import express from "express";
import {authMiddleware} from '../middleware/auth.middleware.js';
// import { createSalesOrder,getAllSalesOrders,cancelSalesOrders, updateSalesOrder } from "../controller/salesOrderController.js";
import { createSalesOrder, getAllSalesOrders,updateSalesOrder } from "../controller/sql/salesOrder.controller.js";
const router = express.Router();


// router.post("/create", createSalesOrder);
// router.get("/get", getAllSalesOrders);
// router.patch("/:soNo/status", cancelSalesOrders);
router.patch("/update/:soNo",authMiddleware,updateSalesOrder);
router.post('/create',authMiddleware,createSalesOrder);
router.get('/get',authMiddleware,getAllSalesOrders);


export default router;