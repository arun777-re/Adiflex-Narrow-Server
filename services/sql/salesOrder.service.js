import pool from "../../config/postgresDB.js";

import { convertToMeter } from "../../helpers/salesOrderHelpers.js";
import { generateNextCycleId } from "../../helpers/productionHelpers.js";
import {
  ALLOWED_DIVISIONS,
  ALLOWED_ORDER_TYPE,
} from "../../constants/divisions.js";
import { sendNotification } from "../../helpers/notificationHelper.js";
import { getCurrentDateTime } from "../../config/db.js";
import { generateNextSoNo } from "../../helpers/sql/salesOrder.helper.js";
import { USERIDS } from "../../constants/userColumns.js";
import { insertProductionProcess } from "./production.service.js";
import { reserveFinishedGoodsStock } from "./fg.service.js";

export const getSalesOrdersService = async () => {
  const query = `
  SELECT
    so.id,
    so.so_no,
    so.order_date,
    si.sku_code AS skucode,
    si.manufactured_qty,
    si.total_wastage_qty,
    si.dispatched_qty,
    so.customer,

    si.item_name AS product_name,

    so.order_type,
    so.route,
    so.party_po,
    si.id AS sales_items_id,
    si.division,

    si.item_qty AS so_qty,
    si.item_unit AS unit,
    si.item_qty_meter AS so_qty_in_meter,

    si.item_rate AS standard_rate,
    si.rate_adjustment,
    si.final_rate,

    si.opening_fg_qty,
    si.production_qty,

    NULL AS job_work,
    si.dispatched_qty,

    so.order_received_by,

    so.overall_status AS status,

    so.billing_location,
    so.shipping_location,

    so.order_amount,
    so.committed_date

  FROM sales_orders so

  LEFT JOIN sales_items si
    ON si.sales_order_id = so.id

  WHERE so.overall_status <> 'Cancelled'

  ORDER BY so.order_date DESC, so.id DESC
`;

  const { rows } = await pool.query(query);

  return rows;
};

export const cancelSalesOrderService = async (soNo) => {
  try {
    const query = `
        UPDATE sales_orders
        SET status = 'Cancelled'
        WHERE so_no = $1
        RETURNING id,so_no,status`;
    const rows = await pool.query(query, [soNo]);

    if (rows.length === 0) {
      const error = new Error(`Sales order with so_no ${soNo} not found.`);
      error.statusCode = 404;
      throw error;
    }
    return rows[0];
  } catch (error) {
    console.error("Error cancelling sales order:", error);
    throw error;
  }
};

// update sales order service
export const updateSalesOrderService = async ({
  soNo,
  soQty,
  rate,
  rateadjustment,
  finalrate,
  unit,
  jobWork,
  shippinglocation,
  billinglocation,
  route,
  skucode,
}) => {
  const fields = [];
  const values = [];

  const addField = (column, value) => {
    if (
      value !== undefined &&
      value !== null &&
      !(typeof value === "string" && value.trim() === "")
    ) {
      fields.push(`${column} = $${values.length + 1}`);
      values.push(value);
    }
  };

  if (soQty !== undefined) {
    addField("so_qty", Number(soQty));
  }

  if (rate !== undefined) {
    addField("standard_rate", Number(rate));
  }

  if (rateadjustment !== undefined) {
    addField("rate_adjustment", Number(rateadjustment));
  }

  if (finalrate !== undefined) {
    addField("final_rate", Number(finalrate));
  }

  if (unit !== undefined) {
    addField("unit", unit);
  }

  if (jobWork !== undefined) {
    addField("job_work", Boolean(jobWork));
  }

  if (shippinglocation !== undefined) {
    addField("shipping_location", shippinglocation);
  }

  if (billinglocation !== undefined) {
    addField("billing_location", billinglocation);
  }

  if (route !== undefined) {
    addField("route", route);
  }

  if (!fields.length) {
    const error = new Error("At least one field must be provided for update.");

    error.statusCode = 400;
    throw error;
  }

  values.push(soNo);
  const soNoParam = `$${values.length}`;

  values.push(skucode);
  const skuParam = `$${values.length}`;

  const query = `
    UPDATE sales_orders
    SET ${fields.join(", ")}
    WHERE so_no = ${soNoParam}
      AND sku_code = ${skuParam}
    RETURNING *;
  `;

  const { rows } = await pool.query(query, values);

  if (!rows.length) {
    const error = new Error(
      `Sales Order with so_no ${soNo} and sku_code ${skucode} not found.`,
    );

    error.statusCode = 404;
    throw error;
  }

  return rows[0];
};

/**
 * Create Sales Order
 *
 * Flow:
 * 1. Validate request
 * 2. Generate SO number
 * 3. BEGIN transaction
 * 4. Fetch Product Master
 * 5. Lock FG Inventory rows
 * 6. Create Sales Order header
 * 7. Create Sales Order items
 * 8. Consume FG
 * 9. Create Dispatch / Production records
 * 10. COMMIT
 * 11. Send notifications
 *
 * IMPORTANT:
 * Notifications are intentionally outside the transaction.
 */


export const createSalesOrderService = async (req) => {
  console.log("🔥 createSalesOrderService started");

  let client;

  try {
    // ========================================================
    // REQUEST DATA
    // ========================================================

    const {
      date,
      customer,
      ordertype,
      jobWork,
      orderReceivedBy,
      products,
      shippinglocation,
      freight,
      billinglocation,
      route,
      partyPO,
    } = req.body;

    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (
      !date ||
      !customer ||
      !Array.isArray(products) ||
      products.length === 0 ||
      !shippinglocation ||
      !billinglocation ||
      !route
    ) {
      throw new Error(
        "Date, Customer, Products, Route and Location are required"
      );
    }

    // ========================================================
    // ORDER TYPE
    // ========================================================

    const normalizedOrderType = String(ordertype || "")
      .trim()
      .toUpperCase();

    if (!ALLOWED_ORDER_TYPE.includes(normalizedOrderType)) {
      throw new Error("Invalid Order Type");
    }

    // ========================================================
    // DIVISION VALIDATION
    // ========================================================

    const normalizedProducts = products.map((item, index) => {
      const division = String(item?.division || "")
        .trim()
        .toLowerCase();

      if (!ALLOWED_DIVISIONS.includes(division)) {
        throw new Error(
          `Invalid Division for product ${index + 1}: ${
            item?.skucode || "Unknown SKU"
          }`
        );
      }

      if (!item?.skucode) {
        throw new Error(
          `SKU Code is required for product ${index + 1}`
        );
      }

      return {
        ...item,
        division,
      };
    });

    // ========================================================
    // DB CONNECTION
    // ========================================================

    client = await pool.connect();

    console.time("🔥 TOTAL SQL SALES ORDER");

    await client.query("BEGIN");

    console.log("🟢 SQL TRANSACTION BEGIN");

    // ========================================================
    // GENERATE SO NUMBER
    // ========================================================

    const soNo = await generateNextSoNo(client);

    console.log("🧾 Generated SO:", soNo);

    // ========================================================
    // PROCESS PRODUCTS
    // ========================================================

    const processedProducts = [];

    let totalOrderQtyMeter = 0;
    let totalProductionQty = 0;
    let totalOrderAmount = 0;

    for (const item of normalizedProducts) {
      const soQty = Number(item.qty) || 0;

      if (soQty <= 0) {
        throw new Error(
          `Invalid quantity for SKU: ${item.skucode}`
        );
      }

      // ------------------------------------------------------
      // PRODUCT MASTER
      // ------------------------------------------------------

      const productResult = await client.query(
        `
          SELECT
            id,
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
          FROM product_master
          WHERE sku_code = $1
          LIMIT 1
        `,
        [item.skucode]
      );

      if (!productResult.rows.length) {
        throw new Error(
          `Product not found in Product Master: ${item.skucode}`
        );
      }

      const productMaster = productResult.rows[0];

      // ------------------------------------------------------
      // PRODUCT STATUS
      // ------------------------------------------------------

      const productStatus = String(productMaster.status || "")
        .trim()
        .toLowerCase();

      if (
        productStatus &&
        !["active", "enabled"].includes(productStatus)
      ) {
        throw new Error(
          `Product is not active: ${item.skucode}`
        );
      }

      // ------------------------------------------------------
      // RATE
      // ------------------------------------------------------

      const itemRate = Number(item.rate) || 0;

      const rateAdjustment = Number(item.rateadjustment) || 0;

      const finalRate =
        Number(item.finalrate) || itemRate + rateAdjustment;

      // ======================================================
      // INTERNAL ORDER
      // ======================================================

      if (normalizedOrderType === "INTERNAL") {
        const productionQty = soQty;

        const itemAmount = finalRate * productionQty;

        const cycleId = generateNextCycleId({
          soNo,
          skucode: item.skucode,
          division: item.division,
        });

        processedProducts.push({
          item,
          productMaster,

          soQty,
          soMeterQty: productionQty,

          freeStock: 0,
          dispatchQty: 0,
          productionQty,

          itemRate,
          rateAdjustment,
          finalRate,
          itemAmount,

          status: "Pending Production",

          cycleId,
          fgStock: null,
        });

        totalOrderQtyMeter += productionQty;
        totalProductionQty += productionQty;
        totalOrderAmount += itemAmount;

        continue;
      }

      // ======================================================
      // CUSTOMER ORDER
      // ======================================================

      const soMeterQty = convertToMeter({
        qty: soQty,
        unit: item.unit,
        basicUnit: productMaster.basic_unit,
        meterPerRoll: productMaster.meter_per_roll,
        meterPerKg: productMaster.meter_per_kg,
      });

      if (soMeterQty <= 0) {
        throw new Error(
          `Unable to calculate meter quantity for SKU: ${item.skucode}`
        );
      }

      // ------------------------------------------------------
      // LOCK FG STOCK
      // ------------------------------------------------------

      const fgResult = await client.query(
        `
          SELECT
            id,
            sku_code,
            product_name,
            division,
            available_qty_meter,
            reserved_qty_meter,
            dispatched_qty_meter
          FROM finished_goods
          WHERE sku_code = $1
            AND LOWER(division) = LOWER($2)
          FOR UPDATE
        `,
        [item.skucode, item.division]
      );

      const fgStock = fgResult.rows[0] || null;

      const freeStock = Number(
        fgStock?.available_qty_meter || 0
      );

      // ------------------------------------------------------
      // FG RESERVATION / PRODUCTION CALCULATION
      // ------------------------------------------------------

      const dispatchQty = Math.min(
        freeStock,
        soMeterQty
      );

      const productionQty = Math.max(
        soMeterQty - dispatchQty,
        0
      );

      const status =
        productionQty === 0
          ? "Ready To Dispatch"
          : "Pending Production";

      // ------------------------------------------------------
      // ITEM AMOUNT
      // ------------------------------------------------------

      const itemAmount = finalRate * soMeterQty;

      // ------------------------------------------------------
      // PRODUCTION CYCLE
      // ------------------------------------------------------

      let cycleId = null;

      if (productionQty > 0) {
        cycleId = generateNextCycleId({
          client,
          soNo,
          skucode: item.skucode,
          division: item.division,
        });
      }

      // ------------------------------------------------------
      // STORE PRODUCT
      // ------------------------------------------------------

      processedProducts.push({
        item,
        productMaster,

        soQty,
        soMeterQty,

        freeStock,
        dispatchQty,
        productionQty,

        itemRate,
        rateAdjustment,
        finalRate,
        itemAmount,

        status,
        cycleId,
        fgStock,
      });

      totalOrderQtyMeter += soMeterQty;
      totalProductionQty += productionQty;
      totalOrderAmount += itemAmount;
    }

    // ========================================================
    // OVERALL ORDER STATUS
    // ========================================================

    const hasProduction = processedProducts.some(
      (item) => item.productionQty > 0
    );

    const overallStatus = hasProduction
      ? "Pending Production"
      : "Ready To Dispatch";

    // ========================================================
    // INSERT SALES ORDER HEADER
    // ========================================================

    const salesOrderResult = await client.query(
      `
        INSERT INTO sales_orders (
          so_no,
          order_date,
          customer,
          order_type,
          route,
          party_po,
          order_received_by,
          overall_status,
          billing_location,
          shipping_location,
          total_items,
          total_order_qty_meter,
          total_manufactured_qty,
          total_dispatched_qty,
          order_amount,
          committed_date
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          NULL
        )
        RETURNING *
      `,
      [
        soNo,
        date,
        customer,
        normalizedOrderType,
        route,
        partyPO || null,
        orderReceivedBy || null,
        overallStatus,
        billinglocation,
        shippinglocation,
        normalizedProducts.length,
        totalOrderQtyMeter,
        0,
        0,
        totalOrderAmount,
      ]
    );

    const salesOrder = salesOrderResult.rows[0];

    console.log(
      "✅ Sales order header inserted:",
      salesOrder.id
    );

    // ========================================================
    // INSERT SALES ITEMS + FG RESERVATION
    // ========================================================

    for (const processed of processedProducts) {
      const {
        item,
        productMaster,
        soQty,
        soMeterQty,
        freeStock,
        dispatchQty,
        productionQty,
        itemRate,
        rateAdjustment,
        finalRate,
        itemAmount,
        fgStock,
      } = processed;

      const salesItemsResult = await client.query(
        `
          INSERT INTO sales_items (
            sales_order_id,
            sku_code,
            item_name,
            division,
            item_unit,
            item_qty,
            item_qty_meter,
            item_rate,
            rate_adjustment,
            final_rate,
            item_amount,
            opening_fg_qty,
            production_qty,
            manufactured_qty,
            dispatched_qty
          )
          VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15
          )
          RETURNING id
        `,
        [
          salesOrder.id,
          item.skucode,
          item.product || productMaster.product_name || null,
          item.division,
          item.unit || productMaster.basic_unit,
          soQty,
          soMeterQty,
          itemRate,
          rateAdjustment,
          finalRate,
          itemAmount,
          freeStock || 0,
          productionQty,
          0,
          0,
        ]
      );

      const salesItemId = salesItemsResult.rows[0].id;

      // ------------------------------------------------------
      // RESERVE FG STOCK
      // ------------------------------------------------------

      if (
        normalizedOrderType === "CUSTOMER" &&
        dispatchQty > 0
      ) {
        if (!fgStock) {
          throw new Error(
            `FG stock not found for SKU: ${item.skucode}`
          );
        }

        await reserveFinishedGoodsStock({
          client,
          salesItemId,
          finishedGoodsId: fgStock.id,
          quantity: dispatchQty,
          skuCode: item.skucode,
        });
      }
    }

    console.log(
      `✅ ${processedProducts.length} sales items inserted`
    );

    // ========================================================
    // PRODUCTION PROCESS
    // ========================================================

    for (const processed of processedProducts) {
      const {
        item,
        productionQty,
        cycleId,
        soMeterQty,
        freeStock,
      } = processed;

      if (productionQty <= 0) {
        continue;
      }

      if (!cycleId) {
        throw new Error(
          `Cycle ID missing for production SKU: ${item.skucode}`
        );
      }

      await insertProductionProcess({
        client,

        salesOrderID: salesOrder.id,
        soNo,

        so_qty: soMeterQty,
        cycleId,

        skuCode: item.skucode,

        productName:
          item.product || processed.productMaster.product_name,

        customer,
        orderType: normalizedOrderType,

        productionQty,
        division: item.division,

        jobWork,

        committedDate: null,
        orderReceivedBy,

        availableInStock: freeStock ?? 0,
      });

      console.log(
        `Production row created: SO=${soNo}, ` +
        `SalesOrderID=${salesOrder.id}, ` +
        `SKU=${item.skucode}, Cycle=${cycleId}`
      );
    }

    // ========================================================
    // COMMIT
    // ========================================================

    await client.query("COMMIT");

    console.log("🟢 SQL TRANSACTION COMMITTED");

    console.timeEnd("🔥 TOTAL SQL SALES ORDER");

    // ========================================================
    // NOTIFICATIONS
    // ========================================================

    try {
      const notifications = [];

      if (totalProductionQty > 0) {
        notifications.push({
          userID: USERIDS.productionwoven,
          role: "productionSupervisor",
          division: "all",
          type: "SALES_ORDER",
          title: "New Sales Order",
          message: `Sales Order ${soNo} requires production.`,
          reference: soNo,
        });
      }

      const totalReservedQty = processedProducts.reduce(
        (sum, item) => sum + item.dispatchQty,
        0
      );

      if (totalReservedQty > 0) {
        notifications.push({
          userID: USERIDS.dispatch,
          role: "dispatch",
          division: "all",
          type: "SALES_ORDER",
          title: "Sales Order Ready To Dispatch",
          message: `Sales Order ${soNo} has FG reserved and is ready for dispatch.`,
          reference: soNo,
        });
      }

      if (notifications.length > 0) {
        await Promise.allSettled(
          notifications.map((notification) =>
            sendNotification(notification)
          )
        );
      }
    } catch (notificationError) {
      console.error(
        "⚠️ Sales order created but notification failed:",
        notificationError
      );
    }

    // ========================================================
    // SUCCESS RESPONSE
    // ========================================================

    const totalReservedQty = processedProducts.reduce(
      (sum, item) => sum + item.dispatchQty,
      0
    );

    return {
      success: true,
      message: "Sales Order Created Successfully",

      soNo,
      salesOrderId: salesOrder.id,

      totalItems: normalizedProducts.length,

      totalOrderQtyMeter,
      totalProductionQty,

      totalReservedQty,
      totalDispatchedQty: 0,

      totalOrderAmount,
      overallStatus,
    };

  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
        console.log("🔴 SQL TRANSACTION ROLLED BACK");
      } catch (rollbackError) {
        console.error(
          "❌ ROLLBACK ERROR:",
          rollbackError
        );
      }
    }

    console.error(
      "❌ createSalesOrderService ERROR:",
      error
    );

    throw error;

  } finally {
    if (client) {
      client.release();
    }
  }
};


