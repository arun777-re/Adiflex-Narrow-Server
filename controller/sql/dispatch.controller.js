// controllers/dispatch.controller.js

import pool from "../../config/postgresDB.js";
import { basicDispatchValidation } from "../../validation/dispatch.validation.js";

export const getPendingDispatches = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id AS reservation_id,
        r.sales_item_id,
        r.finished_goods_id,

        so.so_no,
        so.customer,
        so.billing_location,
        so.shipping_location,
        so.route,
        si.final_rate,
        fg.sku_code,
        fg.product_name,
        fg.division,

        r.reserved_qty_meter,
        r.dispatched_qty_meter,
        r.released_qty_meter,

        GREATEST(
          r.reserved_qty_meter
          - r.dispatched_qty_meter
          - r.released_qty_meter,
          0
        ) AS pending_dispatch_qty,

        r.status,
        r.reserved_at

      FROM fg_stock_reservations r

      JOIN sales_items si
        ON si.id = r.sales_item_id

      JOIN sales_orders so
        ON so.id = si.sales_order_id

      JOIN finished_goods fg
        ON fg.id = r.finished_goods_id

      WHERE r.status IN (
        'RESERVED',
        'PARTIALLY_DISPATCHED'
      )
      AND (
        r.reserved_qty_meter
        - r.dispatched_qty_meter
        - r.released_qty_meter
      ) > 0

      ORDER BY r.reserved_at ASC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get pending dispatches error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending dispatches",
    });
  }
};

// import pool from "../config/db.js";

// // GET /api/dispatch/pending
// // Dispatch Supervisor ki pending dispatch list
// export const getPendingDispatches = async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT
//         r.id AS reservation_id,
//         r.sales_item_id,
//         r.finished_goods_id,

//         so.id AS sales_order_id,
//         so.so_no,
//         so.customer,
//         so.billing_location,
//         so.shipping_location,
//         so.route,

//         fg.sku_code,
//         fg.product_name,
//         fg.division,

//         r.reserved_qty_meter,
//         r.dispatched_qty_meter,
//         r.released_qty_meter,
//         r.remaining_reserved_qty_meter,
//         r.status AS reservation_status,

//         si.dispatched_qty AS sales_item_dispatched_qty

//       FROM fg_stock_reservations r

//       JOIN sales_items si
//         ON si.id = r.sales_item_id

//       JOIN sales_orders so
//         ON so.id = si.sales_order_id

//       JOIN finished_goods fg
//         ON fg.id = r.finished_goods_id

//       WHERE r.status IN (
//         'RESERVED',
//         'PARTIALLY_DISPATCHED'
//       )
//       AND r.remaining_reserved_qty_meter > 0

//       ORDER BY r.reserved_at ASC, r.id ASC
//     `);

//     return res.status(200).json({
//       success: true,
//       count: result.rowCount,
//       data: result.rows,
//     });
//   } catch (error) {
//     console.error("getPendingDispatches:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch pending dispatches",
//     });
//   }
// };

// POST /api/dispatch/confirm
// Dispatch confirm + Delivery Challan create


export const confirmDispatch = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { items, vehicleNo, driverName, gstNo, gstRate = 0 } = req.body;

    const cleanVehicleNo = String(vehicleNo || "").trim();
    const cleanDriverName = String(driverName || "").trim();
    const cleanGstNo = String(gstNo || "").trim() || null;

    const parsedGstRate = Number(gstRate);
    basicDispatchValidation({ items, res,parsedGstRate,cleanDriverName,cleanVehicleNo });

    const requestedItems = items.map((item) => ({
      reservationId: Number(item.reservationId),
      dispatchQty: Number(item.dispatchQty),
    }));

    const reservationIds = requestedItems.map((item) => item.reservationId);
     
    if (
      requestedItems.some(
        (item) =>
          !Number.isSafeInteger(item.reservationId) ||
          item.reservationId <= 0 ||
          !Number.isFinite(item.dispatchQty) ||
          item.dispatchQty <= 0,
      ) ||
      new Set(reservationIds).size !== reservationIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or duplicate reservation items",
      });
    }

    const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

    await client.query("BEGIN");
    transactionStarted = true;

    // 2. Fetch and lock all requested reservations
    const reservationResult = await client.query(
      `
        SELECT
          r.id AS reservation_id,
          r.sales_item_id,
          r.finished_goods_id,
          r.dispatched_qty_meter,
          r.released_qty_meter,
          r.remaining_reserved_qty_meter,
          r.status AS reservation_status,

          fg.sku_code,
          fg.product_name,

          si.sales_order_id,
          si.final_rate,

          so.so_no,
          so.customer,
          so.gst_no,
          so.billing_location,
          so.shipping_location,
          so.route,

          pm.meter_per_roll

        FROM fg_stock_reservations r

        JOIN finished_goods fg
          ON fg.id = r.finished_goods_id

        JOIN sales_items si
          ON si.id = r.sales_item_id

        JOIN sales_orders so
          ON so.id = si.sales_order_id

        JOIN product_master pm
          ON pm.sku_code = fg.sku_code

        WHERE r.id = ANY($1::BIGINT[])

        ORDER BY r.id

        FOR UPDATE OF r, fg
      `,
      [reservationIds],
    );

    if (reservationResult.rowCount !== reservationIds.length) {
      const error = new Error("One or more reservations were not found");
      error.statusCode = 404;
      throw error;
    }

    const reservationMap = new Map(
      reservationResult.rows.map((row) => [Number(row.reservation_id), row]),
    );

    const firstRow = reservationResult.rows[0];

    // 3. Same customer and same delivery details validation
    for (const row of reservationResult.rows) {
      if (
        row.customer !== firstRow.customer ||
        row.billing_location !== firstRow.billing_location ||
        row.shipping_location !== firstRow.shipping_location ||
        row.route !== firstRow.route
      ) {
        const error = new Error(
          "All items must belong to the same customer, billing location, shipping location and route",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // 4. GST number: dispatch entry gets priority.
    // Otherwise use GST number saved in Sales Orders.
    const orderGstNumbers = [
      ...new Set(
        reservationResult.rows
          .map((row) => String(row.gst_no || "").trim())
          .filter(Boolean),
      ),
    ];

    if (orderGstNumbers.length > 1) {
      const error = new Error(
        "Selected Sales Orders have different GST numbers",
      );
      error.statusCode = 400;
      throw error;
    }

    const finalGstNo = cleanGstNo || orderGstNumbers[0] || null;

    // 5. Prepare and validate each item
    const preparedItems = [];

    for (const requestedItem of requestedItems) {
      const row = reservationMap.get(requestedItem.reservationId);
      const dispatchQty = requestedItem.dispatchQty;

      if (
        !["RESERVED", "PARTIALLY_DISPATCHED"].includes(row.reservation_status)
      ) {
        const error = new Error(
          `Reservation ${row.reservation_id} is not available for dispatch`,
        );
        error.statusCode = 409;
        throw error;
      }

      const pendingQty = Number(row.remaining_reserved_qty_meter);

      const meterPerRoll = Number(row.meter_per_roll);
      const ratePerMeter = Number(row.final_rate);

      if (!Number.isFinite(pendingQty) || dispatchQty > pendingQty + 0.001) {
        const error = new Error(
          `Dispatch quantity exceeds pending quantity for reservation ${row.reservation_id}. Pending: ${pendingQty} m`,
        );
        error.statusCode = 400;
        throw error;
      }

      if (
        !Number.isFinite(meterPerRoll) ||
        meterPerRoll <= 0 ||
        !Number.isFinite(ratePerMeter) ||
        ratePerMeter <= 0
      ) {
        const error = new Error(
          `Invalid meter per roll or rate for SKU ${row.sku_code}`,
        );
        error.statusCode = 400;
        throw error;
      }

      const rollQty = round2(dispatchQty / meterPerRoll);
      const amount = round2(dispatchQty * ratePerMeter);

      preparedItems.push({
        row,
        dispatchQty,
        pendingQty,
        meterPerRoll,
        ratePerMeter,
        rollQty,
        amount,
      });
    }

    // 6. Calculate challan totals
    const totalQtyMeter = round2(
      preparedItems.reduce((sum, item) => sum + item.dispatchQty, 0),
    );

    const totalRolls = round2(
      preparedItems.reduce((sum, item) => sum + item.rollQty, 0),
    );

    const totalAmount = round2(
      preparedItems.reduce((sum, item) => sum + item.amount, 0),
    );

    const gstAmount = round2((totalAmount * parsedGstRate) / 100);

    const amountIncludingGst = round2(totalAmount + gstAmount);

    // 7. Generate challan number
    const sequenceResult = await client.query(`
      SELECT nextval('delivery_challan_number_seq') AS sequence_no
    `);

    const sequenceNo = Number(sequenceResult.rows[0].sequence_no);

    const year = new Date().getFullYear();

    const challanNo = `DC-${year}-${String(sequenceNo).padStart(6, "0")}`;

    // 8. Create challan header
    const challanResult = await client.query(
      `
        INSERT INTO delivery_challans (
          challan_no,
          customer_name,
          gst_no,
          billing_location,
          shipping_location,
          route,
          vehicle_no,
          driver_name,
          total_qty_meter,
          total_rolls,
          total_amount,
          gst_rate,
          tax_of_gst,
          amount_including_gst,
          status,
          created_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          'ISSUED', $15
        )
        RETURNING id, challan_no, challan_date
      `,
      [
        challanNo,
        firstRow.customer,
        finalGstNo,
        firstRow.billing_location,
        firstRow.shipping_location,
        firstRow.route,
        cleanVehicleNo,
        cleanDriverName,
        totalQtyMeter,
        totalRolls,
        totalAmount,
        parsedGstRate,
        gstAmount,
        amountIncludingGst,
        req.user?.id ?? null,
      ],
    );

    const challan = challanResult.rows[0];

    // 9. Insert items and update stock/reservations
    const responseItems = [];
    const affectedSalesOrders = new Set();

    for (const item of preparedItems) {
      const {
        row,
        dispatchQty,
        pendingQty,
        meterPerRoll,
        ratePerMeter,
        rollQty,
        amount,
      } = item;

      // Insert challan item
      await client.query(
        `
          INSERT INTO delivery_challan_items (
            challan_id,
            reservation_id,
            sales_item_id,
            sku_code,
            product_name,
            dispatched_qty_meter,
            meter_per_roll,
            roll_qty,
            rate_per_meter,
            amount
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          challan.id,
          row.reservation_id,
          row.sales_item_id,
          row.sku_code,
          row.product_name,
          dispatchQty,
          meterPerRoll,
          rollQty,
          ratePerMeter,
          amount,
        ],
      );

      // Update finished goods stock
      const stockUpdate = await client.query(
        `
          UPDATE finished_goods
          SET
            reserved_qty_meter = reserved_qty_meter - $1,
            dispatched_qty_meter = dispatched_qty_meter + $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
            AND reserved_qty_meter >= $1
          RETURNING id
        `,
        [dispatchQty, row.finished_goods_id],
      );

      if (stockUpdate.rowCount !== 1) {
        throw new Error(
          `Insufficient reserved FG stock for SKU ${row.sku_code}`,
        );
      }

      // Update reservation
      const newDispatchedQty = Number(row.dispatched_qty_meter) + dispatchQty;

      const newRemainingQty = Math.max(0, round2(pendingQty - dispatchQty));

      let newStatus = "RESERVED";

      if (newRemainingQty <= 0.001) {
        newStatus =
          Number(row.released_qty_meter) > 0 ? "RELEASED" : "DISPATCHED";
      } else if (newDispatchedQty > 0) {
        newStatus = "PARTIALLY_DISPATCHED";
      }

      await client.query(
        `
          UPDATE fg_stock_reservations
          SET
            dispatched_qty_meter = $1,
            status = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `,
        [newDispatchedQty, newStatus, row.reservation_id],
      );

      // Update sales item dispatched quantity
      const itemUpdate = await client.query(
        `
          UPDATE sales_items
          SET dispatched_qty =
            COALESCE(dispatched_qty, 0) + $1
          WHERE id = $2
          RETURNING id
        `,
        [dispatchQty, row.sales_item_id],
      );

      if (itemUpdate.rowCount !== 1) {
        throw new Error(`Sales item not found: ${row.sales_item_id}`);
      }

      affectedSalesOrders.add(Number(row.sales_order_id));

      responseItems.push({
        reservationId: row.reservation_id,
        salesOrderNo: row.so_no,
        skuCode: row.sku_code,
        productName: row.product_name,
        dispatchedQty: dispatchQty,
        meterPerRoll,
        rollQty,
        ratePerMeter,
        amount,
        remainingDispatchQty: newRemainingQty,
        reservationStatus: newStatus,
      });
    }

    // 10. Recalculate each affected Sales Order total
    for (const salesOrderId of affectedSalesOrders) {
      await client.query(
        `
          UPDATE sales_orders so
          SET total_dispatched_qty = (
            SELECT COALESCE(SUM(si.dispatched_qty), 0)
            FROM sales_items si
            WHERE si.sales_order_id = so.id
          )
          WHERE so.id = $1
        `,
        [salesOrderId],
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Dispatch and delivery challan created successfully",
      data: {
        challanId: challan.id,
        challanNo: challan.challan_no,
        challanDate: challan.challan_date,
        customerName: firstRow.customer,
        gstNo: finalGstNo,
        billingLocation: firstRow.billing_location,
        shippingLocation: firstRow.shipping_location,
        route: firstRow.route,
        vehicleNo: cleanVehicleNo,
        driverName: cleanDriverName,
        items: responseItems,
        totalQtyMeter,
        totalRolls,
        totalAmount,
        gstRate: parsedGstRate,
        taxOfGst: gstAmount,
        amountIncludingGst,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("confirmDispatch:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to confirm dispatch",
    });
  } finally {
    client.release();
  }
};
