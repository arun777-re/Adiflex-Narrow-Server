import express from "express";

import {
  getFGAvailableQty,
  consumeFGStock,
  addFGStock,
  getAllFG,
  updateStock,
} from "../controller/fgController.js";

const router = express.Router();


router.patch("/consume", consumeFGStock);

router.patch("/add", addFGStock);

router.get('/all',getAllFG);
router.get("/:sku", getFGAvailableQty);
router.patch('/stock/:skucode',updateStock);


export default router;