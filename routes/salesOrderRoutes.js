import express from "express";
import { createSalesOrder,getAllSalesOrders,cancelSalesOrders } from "../controller/salesOrderController.js";

const router = express.Router();


router.post("/create", createSalesOrder);
router.get("/get", getAllSalesOrders);
router.patch("/:soNo/status", cancelSalesOrders);

export default router;