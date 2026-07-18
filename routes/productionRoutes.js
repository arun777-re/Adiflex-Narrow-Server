import express from "express";

import {
  getAllProductionOrders,
  getProductionProcess,
  startProduction,
  completeProduction,
  updateWastage,
} from "../controller/productionController.js";

const router = express.Router();

// get all production orders
router.get(
  "/",
  getAllProductionOrders
);


// get production orders by orders 
router.get(
  "/process/:process",
  getProductionProcess
);


// start process
router.patch(
  "/process/start",
  startProduction
);

// complete process
router.patch(
  "/process/complete",
  completeProduction
);

// update wastage
router.patch(
  "/wastage",
  updateWastage
);


export default router;