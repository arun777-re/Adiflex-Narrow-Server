import { sendResponse } from "../../helpers/sql/global.helper.js";
import { addNewToFG } from "../../services/sql/fg.service.js";

import {
  createProductService,
  getProductsService,
  getProductBySkuService,
  updateProductService,
  updateProductStatusService,
} from "../../services/sql/product.service.js";

// =====================================================
// CREATE PRODUCT
// =====================================================

export const createProduct = async (req, res) => {
  try {
    const { availableQty } = req.body;
    console.log("CREATE PRODUCT BODY:", req.body);

    const product = await createProductService(req.body);

    // add product to fg if opening qty is prodvided;
    if (Number(availableQty) >= 0) {
      await addNewToFG({
        sku_code: product.sku_code,
        division: product.division,
        product_id: product.id,
        product_name: product.productName,
        availableQtyInMeter: Number(availableQty),
      });
    }

    return sendResponse({
      res,
      statusCode: 201,
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    return sendResponse({
      statusCode: 500,
      message: error.message || "Internal Server Error",
      res,
    });
  }
};

// =====================================================
// GET ALL PRODUCTS
// =====================================================

export const getProducts = async (req, res) => {
  try {
    const products = await getProductsService();
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Product fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    return sendResponse({
      res,
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// =====================================================
// GET PRODUCT BY SKU
// =====================================================

export const getProductBySku = async (req, res) => {
  try {
    const { sku } = req.params;

    const product = await getProductBySkuService(sku);

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    console.error("Get Product Error:", error);

    return sendResponse({
      res,
      statusCode: 500,
      message: error.message || "Internal Server Error ",
    });
  }
};

// =====================================================
// UPDATE PRODUCT
// =====================================================

export const updateProduct = async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await updateProductService({
      sku,
      ...req.body,
    });
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    return sendResponse({
      res,
      statusCode: 500,
      message: error.message || "Internal Server Error ",
    });
  }
};

// =====================================================
// UPDATE PRODUCT STATUS
// =====================================================

export const updateProductStatus = async (req, res) => {
  try {
    const { sku } = req.params;
    const { status } = req.body;

    await updateProductStatusService({
      sku,
      status,
    });

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Product status updated successfully",
    });
  } catch (error) {
    console.error("Update Product Status Error:", error);

    return sendResponse({
      res,
      statusCode: 500,
      message: error.message || "Internal Server Error ",
    });
  }
};
