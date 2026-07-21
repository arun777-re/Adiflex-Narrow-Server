import express from "express";

import {

  getDispatchOrders,

  createDispatch,

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


export default router;