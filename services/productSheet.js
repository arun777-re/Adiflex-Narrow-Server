import sheets, { auth } from "../config/db.js";
import { PRODUCT_COLUMNS } from "../constants/productColumns.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

const spreadsheetId = process.env.PRODUCT_MASTER_SHEET_ID;



// get all products service
export const getProductsService = async () => {
  const authClient = await auth.getClient();

  const response = await sheets.spreadsheets.values.get({
    auth: authClient,
    spreadsheetId,
    range: `${SHEET_NAMES.PRODUCT_SHEET}!A:L`,
  });

  const rows = response.data.values || [];

  // Sirf header hai ya sheet empty hai
  if (rows.length <= 1) {
    return [];
  }

  return rows.slice(1).map((row) => ({
    sku: row[PRODUCT_COLUMNS.SKU] || "",
    productName: row[PRODUCT_COLUMNS.PRODUCT_NAME] || "",
    rate:row[PRODUCT_COLUMNS.RATE] || "",
    division: row[PRODUCT_COLUMNS.DIVISION] || "",
    unit: row[PRODUCT_COLUMNS.UNIT] || "",
    color: row[PRODUCT_COLUMNS.COLOR] || "",
    size: row[PRODUCT_COLUMNS.SIZE] || "",
    status: row[PRODUCT_COLUMNS.STATUS] || "",
    createdBy: row[PRODUCT_COLUMNS.CREATED_BY] || "",
    createdAt: row[PRODUCT_COLUMNS.CREATED_AT] || "",
    updatedBy: row[PRODUCT_COLUMNS.UPDATED_BY] || "",
    updatedAt: row[PRODUCT_COLUMNS.UPDATED_AT] || "",
  }));
};



// generate sku code for products acc to division
export const generateSKU = async (division) => {
  const rows = await getProductsService();

  const prefix = division === "Woven" ? "WV" : "CR";

  const skuList = rows
    .map((row) => row.sku)
    .filter(
      (sku) => sku && sku.startsWith(prefix)
    );

  if (skuList.length === 0) {
    return `${prefix}0001`;
  }

  const lastNumber = Math.max(
    ...skuList.map((sku) =>
      Number(sku.replace(prefix, ""))
    )
  );

  return `${prefix}${String(lastNumber + 1).padStart(
    4,
    "0"
  )}`;
};


// create product
export const createProductService = async ({
  productName,
  division,
  unit,
  color,
  rate,
  size,
  createdBy,
}) => {
  const authClient = await auth.getClient();

  const rows = await getProductsService();
// duplicate check 

  const isExists = rows
    .slice(1)
    .some(
      (row) =>
        row[PRODUCT_COLUMNS.PRODUCT_NAME]?.trim().toLowerCase() ===
          productName.trim().toLowerCase() &&
        row[PRODUCT_COLUMNS.DIVISION] === division &&
        (row[PRODUCT_COLUMNS.COLOR] || "").trim().toLowerCase() ===
          (color || "").trim().toLowerCase() &&
        (row[PRODUCT_COLUMNS.SIZE] || "").trim().toLowerCase() ===
          (size || "").trim().toLowerCase() && 
          (row[PRODUCT_COLUMNS.RATE] || "").trim().toLowerCase() ===
          (rate || "").trim().toLowerCase()

    );

  if (isExists) {
    throw new Error(
      "Product already exists."
    );
  }

// generate sku
  const sku = await generateSKU(division);

// append product
  const values = [
    [
      sku,
      productName,
      rate,
      division,
      unit,
      color,
      size,
      "Active",
      createdBy,
      new Date().toISOString(),
      "",
      "",
    ],
  ];

  await sheets.spreadsheets.values.append({
    auth: authClient,
    spreadsheetId,
    range: SHEET_NAMES.PRODUCT_SHEET,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });

  return {
    sku,
    productName,
    rate,
    division,
    unit,
    color,
    size,
    status: "Active",
  };
};


// get product by sku

export const getProductBySkuService = async (
  sku
) => {
  const rows = await getProductsService();

  const row = rows.find(
      
    (item) => item.sku === sku
  );

  if (!row) {
    throw new Error("Product not found");
  }

  return row
};

// update product service
export const updateProductService = async ({
  sku,
  productName,
  rate,
  division,
  unit,
  color,
  size,
  updatedBy,
}) => {
  const authClient = await auth.getClient();

  const rows = await getProductsService();
const rowIndex = rows.findIndex(
  (row) => row.sku === sku
);

  if (rowIndex === -1) {
    throw new Error("Product not found");
  }

  // Skip Header Row
  const actualRow = rowIndex + 1;

  await sheets.spreadsheets.values.update({
    auth: authClient,
    spreadsheetId,
    range: `${SHEET_NAMES.PRODUCT_SHEET}!B${actualRow}:L${actualRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        productName,
        rate,
        division,
        unit,
        color,
        size,
        rows[rowIndex].status, // Existing Status
        rows[rowIndex].createdBy, // Existing Created By
        rows[rowIndex].createdAt, // Existing Created At
        updatedBy,
        new Date().toISOString(),
      ]],
    },
  });

  return await getProductBySkuService(sku);
};


// UPDATE PRODUCT STATUS
export const updateProductStatusService = async ({
  sku,
  status,
  updatedBy,
}) => {
  const authClient = await auth.getClient();

  const rows = await getProductsService();

  const rowIndex = rows.findIndex(
    (row) =>
      row[PRODUCT_COLUMNS.SKU] === sku
  );

  if (rowIndex === -1) {
    throw new Error("Product not found");
  }

  const actualRow = rowIndex + 1;

  await sheets.spreadsheets.values.update({
    auth: authClient,
    spreadsheetId,
    range: `${SHEET_NAMES.PRODUCT_MASTER}!H${actualRow}:L${actualRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        status,
        rows[rowIndex][PRODUCT_COLUMNS.CREATED_BY],
        rows[rowIndex][PRODUCT_COLUMNS.CREATED_AT],
        updatedBy,
        new Date().toISOString(),
      ]],
    },
  });

  return true;
};