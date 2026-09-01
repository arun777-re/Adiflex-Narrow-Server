import {
  createProductService,
  getProductsService,
  getProductBySkuService,
  updateProductService,
  updateProductStatusService,
} from "../services/productSheet.js";
import {addNewProductToFG } from "../services/fgSheets.js";

// CREATE PRODUCT
export const createProduct = async (req, res) => {
  try {
    const { availableQty } = req.body;

    console.log("req.body.....", req.body);

    const product = await createProductService(req.body);

    // Add product to FG if opening quantity is provided
    if (availableQty && Number(availableQty) > 0) {
      await addNewProductToFG({
        skuCode: product.sku,
        product: product.productName,
        division: product.division,
        availableQty: Number(availableQty),
      })
        .then((result) => {
          console.log("FG Stock Added Successfully", result);
        })
        .catch((err) => {
          console.error("Error adding FG Stock", err);
        });
    }

    // SUCCESS
    return res.status(201). json({
      success: true,
      message: "Product created successfully",
      data: product,
    });

  } catch (error) {
    // ERROR
    console.error("Create Product Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL PRODUCTS
export const getProducts = async (req, res) => {
  try {
    const products = await getProductsService();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET PRODUCT BY SKU
export const getProductBySku = async (req, res) => {
  try {
    const { sku } = req.params;

    const product = await getProductBySkuService(sku);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get Product Error:", error);

    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};
// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const { sku } = req.params;

    const product = await updateProductService({
      sku,
      ...req.body,
    });

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE PRODUCT STATUS
export const updateProductStatus = async (req, res) => {
  try {
    const { sku } = req.params;
    const { status } = req.body;

    await updateProductStatusService({
      sku,
      status,
    });

    res.status(200).json({
      success: true,
      message: "Product status updated successfully",
    });
  } catch (error) {
    console.error("Update Product Status Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};