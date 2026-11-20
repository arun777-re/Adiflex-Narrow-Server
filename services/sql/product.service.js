import pool from "../../config/postgresDB.js";
import { generateSKU, generateSKUCode } from "../productSheet.js";

// =====================================================
// CREATE PRODUCT
// =====================================================

export const createProductService = async (data) => {
  const {
    productName,
    division,
    size,
    color,
    rate=1,
    meterPerRoll,
    meterPerKg,
    basicUnit="METER",
    status = "ACTIVE",
    
  } = data;

  if (!productName || !division || !size) {
    throw new Error(
      " Product Name, Division and Size are required"
    );
  }

  const numericSize = Number(size);

  if(!Number.isFinite(numericSize) || numericSize <= 0){
    throw new Error("Invalid Product size");
  }

  const sizeInMM = `${numericSize}mm`


//   generate sku
const sku_code = await generateSKUCode(division);
  const query = `
    INSERT INTO product_master (
      sku_code,
      product_name,
      division,
      size,
      color,
      rate,
      basic_unit,
      meter_per_roll,
      meter_per_kg,
      status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING
      id,
      sku_code,
      product_name AS "productName",
      division,
      size,
      color,
      rate,
      basic_unit AS "basicUnit",
      meter_per_roll AS "meterPerRoll",
      meter_per_kg AS "meterPerKg",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const values = [
    sku_code,
    productName,
    division,
    sizeInMM,
    color || null,
    Number(rate) || 0,
    basicUnit,
    meterPerRoll ? Number(meterPerRoll) : null,
    meterPerKg ? Number(meterPerKg) : null,
    status,
  ];

  try {
    const { rows } = await pool.query(query, values);

    return rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw new Error(`Product with SKU "${sku_code}" already exists`);
    }

    throw error;
  }
};

// =====================================================
// GET ALL PRODUCTS
// =====================================================

export const getProductsService = async () => {
  const query = `
    SELECT
      id,
      sku_code AS skucode,
      product_name AS "productName",
      division,
      size,
      color,
      rate,
      basic_unit AS "basicUnit",
      meter_per_roll AS "meterPerRoll",
      meter_per_kg AS "meterPerKg",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
      FROM product_master
      ORDER BY id DESC
  `;

  const { rows } = await pool.query(query);

  return rows;
};

// =====================================================
// GET PRODUCT BY SKU
// =====================================================

export const getProductBySkuService = async (sku) => {
  const query = `
    SELECT
      id,
      sku_code AS sku,
      product_name AS "productName",
      division,
      size,
      color,
      rate,
      basic_unit AS "basicUnit",
      meter_per_roll AS "meterPerRoll",
      meter_per_kg AS "meterPerKg",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM product_master
    WHERE sku_code = $1
  `;

  const { rows } = await pool.query(query, [sku]);

  if (!rows.length) {
    throw new Error(`Product with SKU "${sku}" not found`);
  }

  return rows[0];
};

// =====================================================
// UPDATE PRODUCT
// =====================================================

export const updateProductService = async (data) => {
  const {
    sku,
    productName,
    division,
    size,
    color,
    rate,
    basicUnit,
    meterPerRoll,
    meterPerKG,
  } = data;
  const query = `
    UPDATE product_master
    SET
      product_name = COALESCE($2, product_name),
      division = COALESCE($3, division),
      size = COALESCE($4, size),
      color = COALESCE($5, color),
      rate = COALESCE($6, rate),
      basic_unit = COALESCE($7, basic_unit),
      meter_per_roll = COALESCE($8, meter_per_roll),
      meter_per_kg = COALESCE($9, meter_per_kg),
      updated_at = CURRENT_TIMESTAMP
      WHERE sku_code = $1
     RETURNING
      id,
      sku_code AS sku,
      product_name AS "productName",
      division,
      size,
      color,
      rate,
      basic_unit AS "basicUnit",
      meter_per_roll AS "meterPerRoll",
      meter_per_kg AS "meterPerKg",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const values = [
    sku,
    productName ?? null,
    division ?? null,
    size ?? null,
    color ?? null,
    rate !== undefined ? Number(rate) : null,
    basicUnit ?? null,
    meterPerRoll !== undefined
      ? Number(meterPerRoll)
      : null,
    meterPerKG !== undefined
      ? Number(meterPerKG)
      : null,
  ];

  const { rows } = await pool.query(query, values);

  if (!rows.length) {
    throw new Error(`Product with SKU "${sku}" not found`);
  }

  return rows[0];
};

// =====================================================
// UPDATE PRODUCT STATUS
// =====================================================

export const updateProductStatusService = async ({
  sku,
  status,
}) => {
  if (!status) {
    throw new Error("Status is required");
  }

  const query = `
    UPDATE product_master
    SET
      status = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE sku_code = $1
    RETURNING
      id,
      sku_code AS sku,
      status,
      updated_at AS "updatedAt"
  `;

  const { rows } = await pool.query(query, [
    sku,
    status,
  ]);

  if (!rows.length) {
    throw new Error(`Product with SKU "${sku}" not found`);
  }

  return rows[0];
};