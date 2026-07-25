import express from "express";

import {
  createProduct,
  getProducts,
  getProductBySku,
  updateProduct,
  updateProductStatus,
} from "../controller/productController.js";

const router = express.Router();

router.post("/create", createProduct);

router.get("/all", getProducts);

router.get("/:sku", getProductBySku);

router.put("/:sku", updateProduct);

router.patch("/:sku/status", updateProductStatus);

export default router;