import express from "express";

// import {
//   getFGAvailableQty,
//   consumeFGStock,
//   addFGStock,
//   getAllFG,
//   updateStock,
// } from "../controller/fgController.js";

import { consumeFGStock,getFGAvailableQtyWithSKU,getAllFG,
  addFGStock,
  updateStock
 } from "../controller/sql/fg.controller.js";

 import {authMiddleware} from '../middleware/auth.middleware.js';

const router = express.Router();


router.patch("/consume",authMiddleware, consumeFGStock);

router.patch("/add",authMiddleware, addFGStock);

router.get('/all',authMiddleware,getAllFG);
router.get("/:sku",authMiddleware, getFGAvailableQtyWithSKU);
router.patch('/stock/:skucode',authMiddleware,updateStock);


export default router;