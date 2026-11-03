import { getCurrentDateTime } from "../../config/db.js";
import pool from "../../config/postgresDB.js";

export const addNewToFG = async ({
  product_id,
  sku_code,
  product_name,
  division,
  availableQtyInMeter,
}) => {
  if (!product_id || !sku_code || !product_name || !division) {
    throw new Error(
      "Either one of product_id, product_name, division is missing",
    );
  }

  const now = getCurrentDateTime();
  const query = `
    INSERT into finished_goods(
    product_id,
    sku_code,
    product_name,
    division,
    available_qty_meter,
    reserved_qty_meter,
    dispatched_qty_meter
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING 
    id,
    product_id,
    sku_code,
    product_name,
    division,
    available_qty_meter,
    reserved_qty_meter,
    dispatched_qty_meter,
    created_at,
    updated_at
    `;

  const values = [
    product_id,
    sku_code,
    product_name,
    division,
    availableQtyInMeter,
    0,
    0,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const getFgAvailableQtyService = async (sku) => {
  try {
    const query = `
      SELECT
        sku_code AS "sku",
        available_qty_meter AS "availableQty"
      FROM finished_goods
      WHERE sku_code = $1
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [sku]);

    if (!rows.length) {
      throw new Error(`FG record not found for SKU "${sku}"`);
    }

    return rows[0];
  } catch (error) {
    console.error("getFgAvailableQtyService Error:", error);
    throw error;
  }
};

// ============================================================
// CONSUME FG STOCK
// ============================================================

export const consumeFGStockService = async ({
  sku,
  qty,
  updatedBy,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const quantity = Number(qty);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Invalid FG quantity");
    }

    // --------------------------------------------------------
    // Lock FG row
    // --------------------------------------------------------

    const selectQuery = `
      SELECT
        id,
        sku_code,
        available_qty_meter,
        reserved_qty_meter,
        dispatched_qty_meter
      FROM finished_goods
      WHERE UPPER(TRIM(sku_code)) = UPPER(TRIM($1))
      FOR UPDATE
    `;

    const { rows } = await client.query(selectQuery, [sku]);

    if (!rows.length) {
      throw new Error(`FG record not found for SKU "${sku}"`);
    }

    const fg = rows[0];

    const availableQty = Number(fg.available_qty_meter) || 0;

    // --------------------------------------------------------
    // Stock validation
    // --------------------------------------------------------

    if (quantity > availableQty) {
      throw new Error(
        `Insufficient FG stock. Available: ${availableQty}, Required: ${quantity}`
      );
    }

    const newAvailableQty = availableQty - quantity;

    const newDispatchedQty =
      (Number(fg.dispatched_qty_meter) || 0) + quantity;

    // --------------------------------------------------------
    // Update stock
    // --------------------------------------------------------

    const updateQuery = `
      UPDATE finished_goods
      SET
        available_qty_meter = $1,
        dispatched_qty_meter = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING
        id,
        sku_code AS "sku",
        product_name AS "productName",
        division,
        available_qty_meter AS "availableQty",
        reserved_qty_meter AS "reservedQty",
        dispatched_qty_meter AS "dispatchedQty",
        updated_at AS "updatedAt"
    `;

    const updateResult = await client.query(updateQuery, [
      newAvailableQty,
      newDispatchedQty,
      fg.id,
    ]);

    await client.query("COMMIT");

    return updateResult.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("consumeFGStockService Error:", error);

    throw error;

  } finally {
    client.release();
  }
};


// ============================================================
// ADD FG STOCK
// ============================================================

export const addFGStockService = async ({
  sku,
  qty,
  updatedBy,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const quantity = Number(qty);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Invalid FG quantity");
    }

    // --------------------------------------------------------
    // Lock FG row
    // --------------------------------------------------------

    const selectQuery = `
      SELECT
        id,
        sku_code,
        available_qty_meter,
        reserved_qty_meter,
        dispatched_qty_meter
      FROM finished_goods
      WHERE UPPER(TRIM(sku_code)) = UPPER(TRIM($1))
      FOR UPDATE
    `;

    const { rows } = await client.query(selectQuery, [sku]);

    if (!rows.length) {
      throw new Error(`FG record not found for SKU "${sku}"`);
    }

    const fg = rows[0];

    const oldAvailableQty =
      Number(fg.available_qty_meter) || 0;

    const newAvailableQty =
      oldAvailableQty + quantity;

    // --------------------------------------------------------
    // Update stock
    // --------------------------------------------------------

    const updateQuery = `
      UPDATE finished_goods
      SET
        available_qty_meter = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        sku_code AS "sku",
        product_name AS "productName",
        division,
        available_qty_meter AS "availableQty",
        reserved_qty_meter AS "reservedQty",
        dispatched_qty_meter AS "dispatchedQty",
        updated_at AS "updatedAt"
    `;

    const updateResult = await client.query(updateQuery, [
      newAvailableQty,
      fg.id,
    ]);

    await client.query("COMMIT");

    return updateResult.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("addFGStockService Error:", error);

    throw error;

  } finally {
    client.release();
  }
};


// ============================================================
// GET ALL FG INVENTORY
// ============================================================


export const getFGInventoryService = async () => {
  try {
    const query = `
      SELECT
        fg.id,
        fg.product_id AS "productId",
        fg.sku_code AS "sku",
        fg.product_name AS "productName",
        fg.division,
        pm.meter_per_roll AS "meterPerRoll",
        COALESCE(fg.available_qty_meter, 0) AS "availableQty",
        COALESCE(fg.reserved_qty_meter, 0) AS "reservedQty",
        COALESCE(fg.dispatched_qty_meter, 0) AS "dispatchedQty",

        COALESCE(res.total_reservations, 0) AS "totalReservations",
        COALESCE(res.active_reservations, 0) AS "activeReservations",
        COALESCE(res.pending_dispatch_qty, 0) AS "pendingDispatchQty",

        COALESCE(res.reservations, '[]'::jsonb) AS reservations,

        fg.created_at AS "createdAt",
        fg.updated_at AS "updatedAt"

      FROM finished_goods fg

      LEFT JOIN product_master pm 
      ON pm.id = fg.product_id

      LEFT JOIN (
        SELECT
          r.finished_goods_id,

          COUNT(*) AS total_reservations,

          COUNT(*) FILTER (
            WHERE r.status IN ('RESERVED', 'PARTIALLY_DISPATCHED')
          ) AS active_reservations,

          SUM(
            CASE
              WHEN r.status IN ('RESERVED', 'PARTIALLY_DISPATCHED')
              THEN r.remaining_reserved_qty_meter
              ELSE 0
            END
          ) AS pending_dispatch_qty,

          JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'reservationId', r.id,
              'salesItemId', r.sales_item_id,
              'salesOrderId', si.sales_order_id,
              'soNo', so.so_no,
              'customer', so.customer,

              'reservedQty', r.reserved_qty_meter,
              'dispatchedQty', r.dispatched_qty_meter,
              'remainingQty', r.remaining_reserved_qty_meter,
              'releasedQty', r.released_qty_meter,

              'status', r.status,
              'reservedAt', r.reserved_at,
              'updatedAt', r.updated_at
            )
            ORDER BY r.id DESC
          ) AS reservations

        FROM fg_stock_reservations r

        LEFT JOIN sales_items si
          ON si.id = r.sales_item_id

        LEFT JOIN sales_orders so
          ON so.id = si.sales_order_id
       
        GROUP BY r.finished_goods_id

      ) res
        ON res.finished_goods_id = fg.id

      ORDER BY fg.id DESC
    `;

    const { rows } = await pool.query(query);

    return rows;

  } catch (error) {
    console.error("getFGInventoryService Error:", error);
    throw error;
  }
};


// ============================================================
// UPDATE FG STOCK
// ============================================================
export const updateFGInventoryService = async ({
  sku,
  newFGQty,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const quantity = Number(newFGQty);

    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error("Invalid FG quantity");
    }

    // --------------------------------------------------------
    // Lock existing FG row
    // --------------------------------------------------------

    const selectQuery = `
      SELECT
        id,
        sku_code,
        available_qty_meter
      FROM finished_goods
      WHERE UPPER(TRIM(sku_code)) = UPPER(TRIM($1))
      FOR UPDATE
    `;

    const { rows } = await client.query(selectQuery, [sku]);

    if (!rows.length) {
      throw new Error(
        `SKU "${sku}" not found in FG Inventory`
      );
    }

    const fg = rows[0];

    const oldFGQty =
      Number(fg.available_qty_meter) || 0;

    // --------------------------------------------------------
    // Same quantity
    // --------------------------------------------------------

    if (oldFGQty === quantity) {
      await client.query("COMMIT");

      return {
        sku: fg.sku_code,
        oldFGQty,
        newFGQty: quantity,
        changed: false,
      };
    }

    // --------------------------------------------------------
    // Update
    // --------------------------------------------------------

    const updateQuery = `
      UPDATE finished_goods
      SET
        available_qty_meter = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        sku_code AS "sku",
        product_name AS "productName",
        division,
        available_qty_meter AS "availableQty",
        reserved_qty_meter AS "reservedQty",
        dispatched_qty_meter AS "dispatchedQty",
        updated_at AS "updatedAt"
    `;

    const { rows: updatedRows } = await client.query(
      updateQuery,
      [quantity, fg.id]
    );

    await client.query("COMMIT");

    return {
      ...updatedRows[0],
      oldFGQty,
      newFGQty: quantity,
      changed: true,
    };

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("updateFGInventoryService Error:", error);

    throw error;

  } finally {
    client.release();
  }
};

// services/fgReservationService.js
export const reserveFinishedGoodsStock = async ({
  client,
  salesItemId,
  finishedGoodsId,
  quantity,
  skuCode,
}) => {
  const reserveQty = Number(quantity);

  if (
    !salesItemId ||
    !finishedGoodsId ||
    !Number.isFinite(reserveQty) ||
    reserveQty <= 0
  ) {
    throw new Error(
      `Invalid FG reservation data for SKU: ${skuCode}`
    );
  }

  // Reserve free stock and update aggregate FG stock.
  const updateResult = await client.query(
    `
      UPDATE finished_goods
      SET
        available_qty_meter = available_qty_meter - $1,
        reserved_qty_meter = reserved_qty_meter + $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND available_qty_meter >= $1
      RETURNING id
    `,
    [reserveQty, finishedGoodsId]
  );

  if (updateResult.rowCount !== 1) {
    throw new Error(
      `Insufficient FG stock for reservation: ${skuCode}`
    );
  }

  // Create order-specific reservation.
  const reservationResult = await client.query(
    `
      INSERT INTO fg_stock_reservations (
        sales_item_id,
        finished_goods_id,
        reserved_qty_meter
      )
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [salesItemId, finishedGoodsId, reserveQty]
  );

  return {
    reservationId: reservationResult.rows[0].id,
    reservedQty: reserveQty,
  };
};


