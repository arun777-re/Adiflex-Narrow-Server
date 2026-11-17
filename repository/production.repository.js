// Repository layer: PostgreSQL access only. Business rules stay in the service.

export const lockProductionCycle = async (client, productionId, cycleID) => {
  const result = await client.query(
    `
      SELECT
        id,
        so_no,
        sku_code,
        sales_order_id,
        cycle_id,
        division,
        status,
        COALESCE(total_production_qty, 0) AS total_production_qty
      FROM production_master
      WHERE ${productionId ? "id = $1" : "cycle_id = $1"}
      FOR UPDATE
    `,
    [productionId || cycleID],
  );
  return result;
};

export const lockProductionStage = async (client, productionId, stageCode) =>
  client.query(
    `
      SELECT
        id,
        stage_code,
        status,
        COALESCE(input_qty, 0) AS input_qty,
        COALESCE(processed_qty, 0) AS processed_qty,
        COALESCE(accepted_qty, 0) AS accepted_qty,
        COALESCE(wastage_qty, 0) AS wastage_qty,
        COALESCE(released_qty, 0) AS released_qty
      FROM production_stage_runs
      WHERE production_process_id = $1
        AND stage_code = $2
      FOR UPDATE
    `,
    [productionId, stageCode],
  );

export const lockNextProductionStage = async (
  client,
  productionId,
  nextStageCode,
) =>
  client.query(
    `
      SELECT
        id,
        status,
        COALESCE(input_qty, 0) AS input_qty,
        COALESCE(accepted_qty, 0) AS accepted_qty,
        COALESCE(released_qty, 0) AS released_qty
      FROM production_stage_runs
      WHERE production_process_id = $1
        AND stage_code = $2
      FOR UPDATE
    `,
    [productionId, nextStageCode],
  );

export const updateCurrentStage = async (
  client,
  {
    stageId,
    releasedQty,
    wastageQty,
    acceptedQty,
    remainingQty,
    pendingInputQty,
    status,
    updatedBy,
    actualQtyAtPacking = 0,
  },
) => {
  return client.query(
    `
      UPDATE production_stage_runs
      SET
        released_qty = $1,
        wastage_qty = $2,
        accepted_qty = $3,
        remaining_qty = $4,
        pending_input_qty = $5,
        actual_qty_at_packing = COALESCE($6,actual_qty_at_packing),
        status = $7::VARCHAR,
        updated_by = $8,
        completed_at = CASE
          WHEN $7::VARCHAR = 'COMPLETED' THEN CURRENT_TIMESTAMP
          ELSE completed_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
    `,
    [
      releasedQty,
      wastageQty,
      acceptedQty,
      remainingQty,
      pendingInputQty,
      actualQtyAtPacking,
      status,
      updatedBy,
      stageId,
    ],
  );
};

export const updateNextStage = async (
  client,
  { stageId, acceptedQty, remainingQty, pendingInputQty, status, updatedBy },
) => {
  return client.query(
    `
      UPDATE production_stage_runs
      SET
        accepted_qty = $1,
        remaining_qty = $2,
        pending_input_qty = $3,
        status = $4,
        updated_by = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `,
    [acceptedQty, remainingQty, pendingInputQty, status, updatedBy, stageId],
  );
};

export const addPackedProductionTotal = async (
  client,
  { productionId, salesOrderId, actualQty, sku_code },
) => {
  const qty = Number(actualQty);

  if (!Number.isFinite(qty) || qty < 0) {
    throw new Error("Invalid actual packed quantity");
  }

  // 1. Update production cycle packed total.
  const productionResult = await client.query(
    `
      UPDATE production_master
      SET
        total_production_qty =
          COALESCE(total_production_qty, 0) + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, total_production_qty
    `,
    [productionId, qty],
  );

  if (productionResult.rowCount !== 1) {
    throw new Error("Production cycle not found while updating packed total");
  }

  // 2. Update the matching Sales Item.
  const salesItemResult = await client.query(
    `
      UPDATE sales_items
      SET
        manufactured_qty =
          COALESCE(manufactured_qty, 0) + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE sales_order_id = $1
        AND sku_code = $3
      RETURNING id, sku_code, manufactured_qty
    `,
    [salesOrderId, qty, sku_code],
  );

  if (salesItemResult.rowCount !== 1) {
    throw new Error(
      `Expected one Sales Item for SKU ${sku_code}, found ${salesItemResult.rowCount}`,
    );
  }

  const salesItemId = salesItemResult.rows[0].id;

  // 3. Get order type.
  const orderResult = await client.query(
    `
      SELECT order_type
      FROM sales_orders
      WHERE id = $1
    `,
    [salesOrderId],
  );

  if (orderResult.rowCount !== 1) {
    throw new Error("Sales order not found while updating FG stock");
  }

  const orderType = String(orderResult.rows[0].order_type || "").toUpperCase();

  // 4. Lock the matching Finished Goods row.
  const fgResult = await client.query(
    `
      SELECT
        id,
        sku_code,
        COALESCE(available_qty_meter, 0) AS available_qty_meter,
        COALESCE(reserved_qty_meter, 0) AS reserved_qty_meter
      FROM finished_goods
      WHERE sku_code = $1
      FOR UPDATE
    `,
    [sku_code],
  );

  if (fgResult.rowCount !== 1) {
    throw new Error(
      `Expected one Finished Goods row for SKU ${sku_code}, found ${fgResult.rowCount}`,
    );
  }

  const finishedGoods = fgResult.rows[0];

  // 5. Add actual packed quantity to free FG stock.
  const fgUpdateResult = await client.query(
    `
      UPDATE finished_goods
      SET
        available_qty_meter =
          COALESCE(available_qty_meter, 0) + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, available_qty_meter, reserved_qty_meter
    `,
    [finishedGoods.id, qty],
  );

  let allocatedQty = 0;
  let waitingQty = 0;

  // 6. CUSTOMER orders: allocate stock to the EXISTING reservation.
  if (orderType === "CUSTOMER") {
    const reservationResult = await client.query(
      `
        SELECT
          id,
          sales_item_id,
          finished_goods_id,
          requested_qty_meter,
          reserved_qty_meter,
          dispatched_qty_meter,
          released_qty_meter,
          status
        FROM fg_stock_reservations
        WHERE sales_item_id = $1
        FOR UPDATE
      `,
      [salesItemId],
    );

    if (reservationResult.rowCount !== 1) {
      throw new Error(
        `Expected one existing FG reservation for Sales Item ${salesItemId}, found ${reservationResult.rowCount}`,
      );
    }

    const reservation = reservationResult.rows[0];

    if (Number(reservation.finished_goods_id) !== Number(finishedGoods.id)) {
      throw new Error(`Reservation FG mismatch for SKU ${sku_code}`);
    }

    const requestedQty = Number(reservation.requested_qty_meter);
    const alreadyReserved = Number(reservation.reserved_qty_meter || 0);
    const alreadyDispatched = Number(reservation.dispatched_qty_meter || 0);
    const alreadyReleased = Number(reservation.released_qty_meter || 0);

    const pendingDemand = Math.max(0, requestedQty - alreadyReserved);

    const availableStock = Math.max(
      0,
      Number(fgUpdateResult.rows[0].available_qty_meter),
    );

    // Allocate only this Sales Item's pending demand.
    allocatedQty = Math.min(availableStock, pendingDemand);

    waitingQty = pendingDemand - allocatedQty;

    if (allocatedQty > 0) {
      // Move allocated quantity from available to reserved FG.
      const allocateStockResult = await client.query(
        `
          UPDATE finished_goods
          SET
            available_qty_meter =
              available_qty_meter - $2::NUMERIC,
            reserved_qty_meter =
              COALESCE(reserved_qty_meter, 0) + $2::NUMERIC,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND available_qty_meter >= $2::NUMERIC
          RETURNING id
        `,
        [finishedGoods.id, allocatedQty],
      );

      if (allocateStockResult.rowCount !== 1) {
        throw new Error(`FG reservation allocation failed for SKU ${sku_code}`);
      }

      // Update the existing reservation. Do NOT insert another row.
      const newReservedQty = alreadyReserved + allocatedQty;

      const newStatus =
        alreadyDispatched > 0 ? "PARTIALLY_DISPATCHED" : "RESERVED";

      await client.query(
        `
          UPDATE fg_stock_reservations
          SET
            reserved_qty_meter = $2::NUMERIC,
            status = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [reservation.id, newReservedQty, newStatus],
      );
    } else {
      waitingQty = pendingDemand;
    }

    console.log("FG RESERVATION ALLOCATION:", {
      salesItemId,
      skuCode: sku_code,
      requestedQty,
      alreadyReserved,
      newlyAllocated: allocatedQty,
      waitingQty,
    });
  }

  return {
    cycleTotal: productionResult.rows[0].total_production_qty,
    salesOrderTotal: salesItemResult.rows[0].manufactured_qty,
    finishedGoodsId: finishedGoods.id,
    packedQtyAddedToFG: qty,
    newlyReservedQty: allocatedQty,
    waitingQty,
    orderType,
  };
};

export const findProductionIdentity = (client, productionId) =>
  client.query(
    `
      SELECT id, so_no, sku_code
      FROM production_master
      WHERE id = $1
    `,
    [productionId],
  );

export const lockSalesOrderSku = (client, soNo, skuCode) =>
  client.query(
    `
      SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))
    `,
    [soNo, skuCode],
  );

export const findProductionForUpdate = (client, productionId) =>
  client.query(
    `
      SELECT
        id,
        so_no,
        sales_order_id,
        cycle_id,
        sku_code,
        product_name,
        division,
        production_target_qty,
        status,
        customer,
        order_type,
        commited_date,
        so_qty,
        available_in_stock,
        COALESCE(actual_cycle_production_qty, 0)
          AS actual_cycle_production_qty,
        COALESCE(first_time_production_qty, 0)
          AS first_time_production_qty,
        COALESCE(total_production_qty, 0)
          AS total_production_qty,
        COALESCE(cycle_remaining_production_qty, 0)
          AS cycle_remaining_production_qty
      FROM production_master
      WHERE id = $1
      FOR UPDATE
    `,
    [productionId],
  );

export const findTotalTarget = (client, soNo, skuCode) =>
  client.query(
    `
      SELECT MAX(production_target_qty) AS target_qty
      FROM production_master
      WHERE so_no = $1 AND sku_code = $2
    `,
    [soNo, skuCode],
  );

export const findStagesForUpdate = (client, productionId) =>
  client.query(
    `
      SELECT
        id,
        stage_code,
        status,
        COALESCE(input_qty, 0) AS input_qty,
        COALESCE(released_qty, 0) AS released_qty
      FROM production_stage_runs
      WHERE production_process_id = $1
      ORDER BY id
      FOR UPDATE
    `,
    [productionId],
  );

export const findAllocatedQuantity = (client, soNo, skuCode) =>
  client.query(
    `
      SELECT COALESCE(
        SUM(actual_cycle_production_qty),
        0
      ) AS allocated_qty
      FROM production_master
      WHERE so_no = $1
        AND sku_code = $2
    `,
    [soNo, skuCode],
  );

export const updateAllStagesQuantity = (
  client,
  { productionId, inputQty, updatedBy },
) =>
  client.query(
    `
      UPDATE production_stage_runs
      SET
        input_qty = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE production_process_id = $3
    `,
    [inputQty, updatedBy, productionId],
  );

export const startStageById = (client, { stageId, inputQty, updatedBy }) =>
  client.query(
    `
      UPDATE production_stage_runs
      SET
        input_qty = $1,
        status = 'IN_PROGRESS',
        started_at = CURRENT_TIMESTAMP,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
    [inputQty, updatedBy, stageId],
  );

export const markProductionInProgress = (client, productionId) =>
  client.query(
    `
      UPDATE production_master
      SET status = 'IN_PROGRESS',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [productionId],
  );

export const findActualQuantity = (client, soNo, skuCode) =>
  client.query(
    `
      SELECT COALESCE(SUM(total_production_qty), 0) AS actual_qty
      FROM production_master
      WHERE so_no = $1 AND sku_code = $2
    `,
    [soNo, skuCode],
  );

export const updateOrderQuantities = (
  client,
  { soNo, skuCode, remainingQty },
) =>
  client.query(
    `
      UPDATE production_master
      SET
        cycle_remaining_production_qty =
          CASE
            WHEN actual_cycle_production_qty > 0
            THEN GREATEST(
              actual_cycle_production_qty - COALESCE(total_production_qty, 0),
              0
            )
            ELSE 0
          END,
        updated_at = CURRENT_TIMESTAMP
      WHERE so_no = $1
        AND sku_code = $2
    `,
    [soNo, skuCode],
  );

export const findPendingCycle = (client, { soNo, skuCode, excludeId }) =>
  client.query(
    `
      SELECT
        pm.id,
        pm.cycle_id
      FROM production_master pm
      WHERE pm.so_no = $1
        AND pm.sku_code = $2
        AND pm.id <> $3
        AND pm.status = 'PENDING'
        AND COALESCE(pm.actual_cycle_production_qty, 0) = 0
      ORDER BY pm.id
      LIMIT 1
      FOR UPDATE
    `,
    [soNo, skuCode, excludeId],
  );

export const findCycleIds = (client, soNo, skuCode) =>
  client.query(
    `
      SELECT cycle_id
      FROM production_master
      WHERE so_no = $1 AND sku_code = $2
    `,
    [soNo, skuCode],
  );

export const insertProductionCycle = (
  client,
  { production, nextCycleId, totalTarget, remainingQty },
) => {
  console.log("production", production);
  if (!production?.sales_order_id) {
    throw new Error(
      `Cannot create next cycle: sales_order_id missing for SO ${production?.so_no}`,
    );
  }

  return client.query(
    `
      INSERT INTO production_master (
        sales_order_id,
        so_no,
        cycle_id,
        sku_code,
        product_name,
        production_target_qty,
        division,
        status,
        commited_date,
        customer,
        order_type,
        total_production_qty,
        cycle_remaining_production_qty,
        so_qty,
        available_in_stock,
        actual_cycle_production_qty,
        first_time_production_qty
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        'PENDING', $8, $9, $10, 0, 0, $11, $12, 0, $13
      )
      RETURNING id, sales_order_id, so_no, cycle_id
    `,
    [
      production.sales_order_id,
      production.so_no,
      nextCycleId,
      production.sku_code,
      production.product_name,
      totalTarget,
      production.division,
      production.commited_date,
      production.customer,
      production.order_type,
      Number(production.so_qty || totalTarget),
      Number(production.available_in_stock || 0),
      remainingQty,
    ],
  );
};

export const insertCycleStages = async (
  client,
  { productionId, allStages },
) => {
  for (const stage of allStages) {
    await client.query(
      `
        INSERT INTO production_stage_runs (
          production_process_id,
          stage_code,
          input_qty,
          status
        )
        VALUES ($1, $2, 0, 'PENDING')
        ON CONFLICT (production_process_id, stage_code)
        DO NOTHING
      `,
      [productionId, stage.stage_code],
    );
  }
};

export const updateWastageToTheSalesOrder = async (
  client,
  { newWastageQty, production },
) => {
  console.log(
    "SKU code:",
    production.sku_code,
    "Sales Order ID:",
    production.sales_order_id,
  );

  const result = await client.query(
    `
      UPDATE sales_items AS si
      SET total_wastage_qty =
        COALESCE(si.total_wastage_qty, 0) + $1
      WHERE si.sales_order_id = $2
      AND si.sku_code = $3
       
      RETURNING si.sales_order_id, si.total_wastage_qty
    `,
    [
      Number(newWastageQty),
      Number(production.sales_order_id),
      production.sku_code,
    ],
  );

  return result;
};
