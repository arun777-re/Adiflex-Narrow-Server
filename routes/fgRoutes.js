import express from "express";

import {
  getFGAvailableQty,
  consumeFGStock,
  addFGStock,
  getAllFG,
} from "../controller/fgController.js";

const router = express.Router();


router.patch("/consume", consumeFGStock);

router.patch("/add", addFGStock);

router.get('/all',getAllFG);
router.get("/:sku", getFGAvailableQty);


export default router;