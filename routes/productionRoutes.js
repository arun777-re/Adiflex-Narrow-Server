import express from "express";

import {
  getAllProductionOrders,
  getProductionProcess,
  // startProduction,
  // completeProduction,
  updateWastage,
  completeQuality,
  getAllJobWorkOrders,
} from "../controller/productionController.js";
import {getAllProduction,startProduction,completeProduction, 
  getAllQualitySupervisorOrders, getAllPackingSupervisorOrders,addCommitedDateToOrder,
  getAllCyclesCompletedPendingOrders} from '../controller/sql/production.controller.js'
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// get all production orders
router.get(
  "/getAll/:division",authMiddleware,
  getAllProduction
);
router.get(
  "/getAll/quality-supervisor/:division",authMiddleware,
  getAllQualitySupervisorOrders
);

router.get(
  "/getAll/packing-supervisor/:division",authMiddleware,
  getAllPackingSupervisorOrders
);


// get production orders by orders 
router.get(
  "/process/:process",authMiddleware,
  getProductionProcess
);


// start process
router.patch(
  "/process/start",authMiddleware,
  startProduction
);

// complete process
router.patch(
  "/process/complete",authMiddleware,
  completeProduction
);

// // update wastage
// router.patch(
//   "/wastage",authMiddleware,
//   updateWastage
// );

// router.post(
//   "/complete-quality",
//   completeQuality
// );

router.get('/job-work/:division',authMiddleware,getAllJobWorkOrders);

router.patch('/add-commited-date',authMiddleware,addCommitedDateToOrder);
router.get('/completed-pending/:division',authMiddleware,getAllCyclesCompletedPendingOrders);

export default router;