import express from "express";
// import { createSalesOrder,getAllSalesOrders,cancelSalesOrders, updateSalesOrder } from "../controller/salesOrderController.js";
import { createSalesOrder, getAllSalesOrders } from "../controller/sql/salesOrder.controller.js";
const router = express.Router();


// router.post("/create", createSalesOrder);
// router.get("/get", getAllSalesOrders);
// router.patch("/:soNo/status", cancelSalesOrders);
// router.patch("/update/:soNo",updateSalesOrder);
router.post('/create',createSalesOrder);
router.get('/get',getAllSalesOrders);


export default router;