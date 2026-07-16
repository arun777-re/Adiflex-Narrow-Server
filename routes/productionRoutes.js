import express from "express";

import {
  getAllProductionOrders,
  getProductionByProcess,
  updateProductionProcess,
  updateWastage,
} from "../controller/productionController.js";

const router = express.Router();

router.get("/", getAllProductionOrders);

router.get("/process/:process", getProductionByProcess);

router.patch("/process", updateProductionProcess);

router.patch("/wastage", updateWastage);

export default router;