import express from "express";

import {

  getDispatchOrders,

  createDispatch,
  getAllCompletedDispatchOrders,
  billingDone,

} from "../controller/dispatchController.js";


const router =
  express.Router();


// GET ALL DISPATCH
router.get(

  "/",

  getDispatchOrders

);


// DISPATCH QTY
router.post(

  "/",

  createDispatch

);
// Completed dispatch orders 
router.get(

  "/completed",

  getAllCompletedDispatchOrders

);
router.post(

  "/billing",

  billingDone

);


export default router;