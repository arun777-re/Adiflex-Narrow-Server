import express from "express";

import {

  getDispatchOrders,

  createDispatch,
  getAllCompletedDispatchOrders,

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
router.post(

  "/completed",

  getAllCompletedDispatchOrders

);


export default router;