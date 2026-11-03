import {
  PARTIAL_RELEASE_STAGES,
  PRODUCTION_STAGES,
} from "../../constants/production.constant.js";
import {
  addPackedProductionTotal,
  lockNextProductionStage,
  lockProductionCycle,
  lockProductionStage,
  updateCurrentStage,
  updateNextStage,
  updateWastageToTheSalesOrder,
} from "../../repository/production.repository.js";

import pool from "../../config/postgresDB.js";

import {
  findProductionIdentity,
  lockSalesOrderSku,
  findProductionForUpdate,
  findTotalTarget,
  findStagesForUpdate,
  findAllocatedQuantity,
  updateAllStagesQuantity,
  startStageById,
  markProductionInProgress,
  updateOrderQuantities,
  findPendingCycle,
  findCycleIds,
  insertProductionCycle,
  insertCycleStages,
} from "../../repository/production.repository.js";

import {
  getNextCycleId,
  getUpdatedBy,
} from "../../helpers/sql/production.helper.js";

import {
  createProductionError,
  validateStartProductionRequest,
  validateProductionAuthorization,
  validateProductionStatus,
  validateTargetQuantity,
  validateStageAndGetFirst,
  validateFinishingCanStart,
  validateFirstStageQuantity,
  validateOtherStageQuantity,
} from "../../validation/production.validation.js";
import { USERIDS } from "../../constants/userColumns.js";
import { sendNotification } from "../../helpers/notificationHelper.js";

export const insertProductionProcess = async ({
  client,
  soNo,
  so_qty,
  cycleId,
  skuCode,
  productName,
  customer,
  orderType,
  productionQty,
  division,
  jobWork,
  committedDate,
  orderReceivedBy,
  availableInStock,
  salesOrderID,
}) => {
  const targetQty = Number(productionQty) || 0;
  const salesOrderQty = Number(so_qty) || 0;
  const stockQty = Number(availableInStock) || 0;
  const salesOrderId = Number(salesOrderID);

  if (!soNo || !cycleId || !skuCode) {
    throw new Error("SO No, Cycle ID and SKU Code are required");
  }

  if (!Number.isInteger(salesOrderId) || salesOrderId <= 0) {
    throw new Error("Valid salesOrderID is required");
  }

  if (targetQty <= 0) {
    throw new Error(`Invalid production quantity for ${skuCode}`);
  }

  if (salesOrderQty <= 0) {
    throw new Error(`Invalid sales order quantity for ${skuCode}`);
  }

  if (stockQty < 0 || stockQty > salesOrderQty) {
    throw new Error(
      "Available stock cannot be negative or exceed sales order quantity",
    );
  }
  if (!Number.isInteger(Number(salesOrderID)) || Number(salesOrderID) <= 0) {
    throw new Error("Valid salesOrderID is required");
  }
  // STEP 1: Verify the parent Sales Order.
  const salesOrderResult = await client.query(
    `
      SELECT id, so_no
      FROM sales_orders
      WHERE id = $1
      FOR KEY SHARE
    `,
    [salesOrderId],
  );

  if (salesOrderResult.rowCount === 0) {
    throw new Error(`Sales Order not found for salesOrderID: ${salesOrderId}`);
  }

  const salesOrder = salesOrderResult.rows[0];

  if (salesOrder.so_no !== soNo) {
    throw new Error(
      `Sales Order mismatch: ID ${salesOrderId} belongs to ${salesOrder.so_no}, not ${soNo}`,
    );
  }

  // STEP 2: Create production master linked to Sales Order.
  const masterResult = await client.query(
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
        actual_cycle_production_qty,
        first_time_production_qty,
        cycle_remaining_production_qty,
        available_in_stock,
        so_qty
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, 0, 0, $12, 0, $13, $14
      )
      RETURNING *
    `,
    [
      salesOrderId,
      soNo,
      cycleId,
      skuCode,
      productName || skuCode,
      targetQty,
      division,
      "PENDING",
      committedDate || null,
      customer || salesOrder.so_no,
      orderType || "CUSTOMER",
      0,
      stockQty,
      salesOrderQty,
    ],
  );

  const master = masterResult.rows[0];

  // STEP 3: Determine whether JOB_WORK is required.
  const isJobWork =
    jobWork === true ||
    String(jobWork ?? "")
      .trim()
      .toLowerCase() === "true";

  // STEP 4: Build stages in production order.
  const stages = [
    ...(isJobWork ? ["JOB_WORK"] : []),
    ...PRODUCTION_STAGES.filter((stage) => stage !== "JOB_WORK"),
  ];

  if (stages.length === 0) {
    throw new Error("No production stages configured");
  }

  console.log("MASTER CREATED:", {
    id: master.id,
    salesOrderId: master.sales_order_id,
    soNo: master.so_no,
    cycleId: master.cycle_id,
    skuCode: master.sku_code,
    targetQty: master.production_target_qty,
    firstStage: stages[0],
  });

  // STEP 5: Create stage records.
  for (const stageCode of stages) {
    await client.query(
      `
        INSERT INTO production_stage_runs (
          production_process_id,
          stage_code,
          input_qty,
          accepted_qty,
          wastage_qty,
          released_qty,
          status,
          created_by,
          updated_by
        )
        VALUES ($1, $2, 0, 0, 0, 0, 'PENDING', $3, $3)
      `,
      [master.id, stageCode, orderReceivedBy || "SYSTEM"],
    );
  }

  console.log(
    `Production created: ${soNo} | ${skuCode} | ` +
      `Master ID: ${master.id} | First stage: ${stages[0]} | ` +
      `Stages: ${stages.join(", ")}`,
  );

  return {
    ...master,
    stages,
  };
};

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getActorId = (updatedBy, user) =>
  updatedBy || user.id || user.userId || null;

// complete production service
export const completeProductionService = async ({ client, payload, user }) => {
  const {
    productionId,
    cycleID,
    process,
    releaseQty,
    wastageQty,
    actualQtyAtPacking,
    updatedBy,
  } = payload;

  console.log("payload", payload);

  const stageCode = String(process || "")
    .trim()
    .toUpperCase();

  const isPartialReleaseStage =
    PARTIAL_RELEASE_STAGES.includes(stageCode) && stageCode !== "QUALITY";

  const actorId = getActorId(updatedBy, user);

  // 1. Lock production cycle.
  const productionResult = await lockProductionCycle(
    client,
    productionId,
    cycleID,
  );

  if (productionResult.rowCount === 0) {
    throw createHttpError(404, "Production cycle not found");
  }

  const production = productionResult.rows[0];

  // 2. Find first stage: JOB_WORK if present, otherwise WARPING.
  const firstStageResult = await client.query(
    `
      SELECT stage_code
      FROM production_stage_runs
      WHERE production_process_id = $1
        AND stage_code IN ('JOB_WORK', 'WARPING')
      ORDER BY
        CASE stage_code
          WHEN 'JOB_WORK' THEN 1
          WHEN 'WARPING' THEN 2
        END
      LIMIT 1
    `,
    [production.id],
  );

  const firstStageCode = firstStageResult.rows[0]?.stage_code;

  if (!firstStageCode) {
    throw createHttpError(
      400,
      "First production stage JOB_WORK or WARPING not found",
    );
  }

  const isFirstStage = stageCode === firstStageCode;

  // 3. Lock current stage.
  const stageResult = await lockProductionStage(
    client,
    production.id,
    stageCode,
  );

  if (stageResult.rowCount === 0) {
    throw createHttpError(404, `${stageCode} stage not found`);
  }

  const stage = stageResult.rows[0];
  const currentStatus = String(stage.status || "").toUpperCase();

  if (
    stageCode === "QUALITY" &&
    ["COMPLETED", "CANCELLED"].includes(currentStatus)
  ) {
    throw createHttpError(
      400,
      "Quality is already completed or cancelled. Wastage cannot be posted again.",
    );
  }

  if (!["IN_PROGRESS", "PARTIALLY_RELEASED"].includes(currentStatus)) {
    throw createHttpError(
      400,
      "Only an in-progress or partially released stage can be completed",
    );
  }

  const inputQty = Number(stage.input_qty);
  const alreadyReleased = Number(stage.released_qty || 0);
  const previouslyAccepted = Number(stage.accepted_qty || 0);
  const previousWastage = Number(stage.wastage_qty || 0);

  if (
    !Number.isFinite(inputQty) ||
    inputQty <= 0 ||
    !Number.isFinite(alreadyReleased) ||
    !Number.isFinite(previouslyAccepted) ||
    !Number.isFinite(previousWastage) ||
    alreadyReleased < 0 ||
    previouslyAccepted < 0 ||
    previousWastage < 0
  ) {
    throw createHttpError(400, "Invalid stage quantity values");
  }

  // Quantity counters.
  let transferQty = 0;
  let newReleasedQty = alreadyReleased;
  let newAcceptedQty = previouslyAccepted;
  let newWastageQty = previousWastage;
  let additionalWastageQty = 0;

  // 4. Calculate current stage release.
  if (isPartialReleaseStage) {
    // Example: MACHINE releases 700 now and more later.
    transferQty = Number(releaseQty);

    if (!Number.isFinite(transferQty) || transferQty <= 0) {
      throw createHttpError(400, "Release quantity must be greater than zero");
    }

    const availableToRelease = Math.max(
      0,
      previouslyAccepted - alreadyReleased,
    );

    if (transferQty > availableToRelease + 0.001) {
      throw createHttpError(
        400,
        `Only ${availableToRelease} quantity is available to release`,
      );
    }

    newReleasedQty = alreadyReleased + transferQty;
  } else if (stageCode === "QUALITY") {
    const release = Number(releaseQty);
    const wastage = Number(wastageQty);

    if (!Number.isFinite(release) || release < 0) {
      throw createHttpError(400, "Enter a valid release quantity");
    }

    if (!Number.isFinite(wastage) || wastage < 0) {
      throw createHttpError(400, "Enter a valid additional wastage quantity");
    }

    // IMPORTANT:
    // accepted_qty = total quantity received by QUALITY.
    // Do not reduce accepted_qty when wastage occurs.
    // Remaining = accepted - already released - previous wastage.
    const remainingQty = Math.max(0, previouslyAccepted - alreadyReleased);

    if (release === 0 && wastage === 0) {
      throw createHttpError(
        400,
        "Release quantity or additional wastage must be greater than zero",
      );
    }

    if (wastage > remainingQty + 0.001) {
      throw createHttpError(
        400,
        `additional wastage (${wastage}) cannot exceed remaining quantity (${remainingQty}).`,
      );
    }

    transferQty = release;
    newReleasedQty = alreadyReleased + release;

    // Keep accepted quantity unchanged.
    newAcceptedQty = previouslyAccepted;

    // Save cumulative wastage in QUALITY stage.
    newWastageQty = previousWastage + wastage;

    // Only this update's wastage is added to the sales order.
    additionalWastageQty = wastage;

    if (newReleasedQty > newAcceptedQty + 0.001) {
      throw createHttpError(
        400,
        "Total released quantity cannot exceed accepted quantity",
      );
    }
  } else if (stageCode === "PACKING") {
    // Packing consumes the accepted quantity.
    transferQty = previouslyAccepted;
    newAcceptedQty = previouslyAccepted;
    newReleasedQty = previouslyAccepted;

    const actualPackedQty = Number(actualQtyAtPacking);

    if (!Number.isFinite(actualPackedQty) || actualPackedQty < 0) {
      throw createHttpError(400, "Enter a valid actual packed quantity");
    }

    if (actualPackedQty > previouslyAccepted + 0.001) {
      throw createHttpError(
        400,
        `Actual packed quantity cannot exceed accepted quantity ${previouslyAccepted}`,
      );
    }
  } else {
    // First stage uses its input quantity.
    // Other normal stages release quantity already received.
    const availableQty = isFirstStage ? inputQty : previouslyAccepted;

    transferQty = Math.max(0, availableQty - alreadyReleased);
    newReleasedQty = alreadyReleased + transferQty;

    if (isFirstStage) {
      newAcceptedQty = inputQty;
    }
  }

  if (!Number.isFinite(transferQty) || transferQty < 0) {
    throw createHttpError(400, "Invalid transfer quantity");
  }

  // 5. Calculate remaining and pending quantities.
  // QUALITY wastage is accounted for separately.
  const newRemainingQty = Math.max(0, newAcceptedQty - newReleasedQty);

  const newPendingInputQty = isFirstStage
    ? 0
    : Math.max(0, inputQty - newAcceptedQty);

  // QUALITY is fully complete only when:
  // 1. All planned input has arrived.
  // 2. All accepted quantity is released or recorded as wastage.
  const isFullyReleased =
    stageCode === "QUALITY"
      ? newRemainingQty <= 0.001 && newPendingInputQty <= 0.001
      : newReleasedQty >= newAcceptedQty - 0.001 && newPendingInputQty <= 0.001;

  const newStageStatus = isFullyReleased ? "COMPLETED" : "PARTIALLY_RELEASED";

  // Store actual packed quantity, not the stage's released quantity.
  const newActualQuantityAtPacking =
    stageCode === "PACKING" ? Number(actualQtyAtPacking) : null;
  console.log("STAGE STATUS DEBUG", {
    stageCode,
    currentStatus,
    inputQty,
    previouslyAccepted,
    alreadyReleased,
    previousWastage,
    transferQty,
    newAcceptedQty,
    newReleasedQty,
    newRemainingQty,
    newPendingInputQty,
    isFullyReleased,
    newStageStatus,
  });
  // 6. Update current stage.
  await updateCurrentStage(client, {
    stageId: stage.id,
    releasedQty: newReleasedQty,
    wastageQty: newWastageQty,
    acceptedQty: newAcceptedQty,
    remainingQty: newRemainingQty,
    pendingInputQty: newPendingInputQty,
    status: newStageStatus,
    updatedBy: actorId,
    actualQtyAtPacking: newActualQuantityAtPacking,
  });

  // 7. Transfer released good quantity to the next stage.
  const currentIndex = PRODUCTION_STAGES.indexOf(stageCode);

  if (currentIndex === -1) {
    throw createHttpError(400, `Unknown production stage: ${stageCode}`);
  }

  const nextStageCode = PRODUCTION_STAGES[currentIndex + 1] || null;

  if (nextStageCode && transferQty > 0) {
    const nextStageResult = await lockNextProductionStage(
      client,
      production.id,
      nextStageCode,
    );

    if (nextStageResult.rowCount === 0) {
      throw createHttpError(400, `Next stage ${nextStageCode} not found`);
    }

    const nextStage = nextStageResult.rows[0];
    const nextStatus = String(nextStage.status || "").toUpperCase();
    console.log("NEXT STAGE STATUS DEBUG", {
      currentStage: stageCode,
      nextStageCode,
      nextStatus: nextStage.status,
      nextInputQty: nextStage.input_qty,
      nextAcceptedQty: nextStage.accepted_qty,
      nextReleasedQty: nextStage.released_qty,
    });
    if (nextStatus === "CANCELLED" || nextStatus === "COMPLETED") {
      throw createHttpError(
        400,
        `Next stage ${nextStageCode} is ${nextStatus.toLowerCase()}`,
      );
    }

    const nextInputQty = Number(nextStage.input_qty || 0);
    const nextAcceptedQty = Number(nextStage.accepted_qty || 0);
    const nextReleasedQty = Number(nextStage.released_qty || 0);

    if (
      !Number.isFinite(nextInputQty) ||
      !Number.isFinite(nextAcceptedQty) ||
      !Number.isFinite(nextReleasedQty) ||
      nextAcceptedQty < 0 ||
      nextReleasedQty < 0
    ) {
      throw createHttpError(
        400,
        `Invalid quantity values in next stage ${nextStageCode}`,
      );
    }

    // Add only the newly released quantity.
    const updatedAcceptedQty = nextAcceptedQty + transferQty;

    const nextRemainingQty = Math.max(0, updatedAcceptedQty - nextReleasedQty);

    const nextPendingInputQty =
      nextStageCode === firstStageCode
        ? 0
        : Math.max(0, nextInputQty - updatedAcceptedQty);

    let updatedNextStatus;

    if (nextRemainingQty <= 0.001 && nextPendingInputQty <= 0.001) {
      // No remaining qty and no pending input
      updatedNextStatus = "COMPLETED";
    } else if (nextReleasedQty > 0) {
      // SOME QTY HAS ALREADY BEEN RELEASED,BUT MORE  WORK/INPUT REMAINS
      updatedNextStatus ="PARTIALLY_RELEASED";
       
    }else{
      // quantity received,but nothing released yet
      updatedNextStatus = "IN_PROGRESS";
    }
    if (stageCode === "QUALITY") {
      sendNotification({
        userID: USERIDS.packingdepartment,
        role: "packingsupervisor",
        division: "all",
        type: "PRODUCTION_ORDER",
        title: "NEW PRODUCTION ORDER IS RECEIVED",
        message: `Production Order ${production.sku_code} received.`,
        reference: production.id,
      });
    }

    await updateNextStage(client, {
      stageId: nextStage.id,
      acceptedQty: updatedAcceptedQty,
      remainingQty: nextRemainingQty,
      pendingInputQty: nextPendingInputQty,
      status: updatedNextStatus,
      updatedBy: actorId,
    });
  }

  // 8. Save actual packed quantity to production totals.
  if (stageCode === "PACKING") {
    await addPackedProductionTotal(client, {
      productionId: production.id,
      actualQty: Number(actualQtyAtPacking),
      salesOrderId: Number(production.sales_order_id),
      sku_code: production.sku_code,
    });
  }

  // 9. Update sales order wastage.
  // Pass only the additional wastage from THIS update,
  // because the helper should add it to the existing sales-order total.
  if (stageCode === "QUALITY" && additionalWastageQty > 0) {
    const wastageUpdateResult = await updateWastageToTheSalesOrder(client, {
      newWastageQty: additionalWastageQty,
      production,
    });

    if (wastageUpdateResult.rowCount === 0) {
      throw createHttpError(
        404,
        "Sales order not found while saving Quality wastage",
      );
    }

    console.log("Quality wastage saved:", {
      salesOrderId: production.sales_order_id,
      wastageAddedThisUpdate: additionalWastageQty,
      totalSalesOrderWastage: wastageUpdateResult.rows[0]?.previous_wastage_qty,
    });
  }

  return {
    productionId: production.id,
    soNo: production.so_no,
    cycleID: production.cycle_id,
    completedStage: stageCode,
    releasedThisTime: transferQty,
    totalReleasedQty: newReleasedQty,
    inputQty,
    remainingQty: newRemainingQty,
    pendingInputQty: newPendingInputQty,
    wastageQty: stageCode === "QUALITY" ? newWastageQty : undefined,
    acceptedQty: newAcceptedQty,
    actualQtyAtPacking:
      stageCode === "PACKING" ? Number(actualQtyAtPacking) : undefined,
    stageStatus: newStageStatus,
    nextStage: nextStageCode,
    firstStageCode,
    isFullyReleased,
  };
};

export const startProductionService = async ({ payload, user }) => {
  const { productionId, stageCode } = validateStartProductionRequest({
    payload,
    user,
  });

  const { productionQty } = payload;

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // 1. Find SO/SKU.
    const identityResult = await findProductionIdentity(client, productionId);

    if (!identityResult.rowCount) {
      throw createProductionError(404, "Production cycle not found");
    }

    const identity = identityResult.rows[0];

    // Serialize all allocations for the same SO + SKU.
    await lockSalesOrderSku(client, identity.so_no, identity.sku_code);

    // 2. Lock current cycle.
    const productionResult = await findProductionForUpdate(
      client,
      productionId,
    );

    if (!productionResult.rowCount) {
      throw createProductionError(404, "Production cycle not found");
    }

    const production = productionResult.rows[0];

    validateProductionAuthorization({
      user,
      stageCode,
      productionDivision: production.division,
    });

    validateProductionStatus(production.status);

    // 3. Get total SO production target.
    const targetResult = await findTotalTarget(
      client,
      production.so_no,
      production.sku_code,
    );

    const totalTarget = validateTargetQuantity(
      targetResult.rows[0]?.target_qty,
    );

    // 4. Lock all stages of this cycle.
    const stagesResult = await findStagesForUpdate(client, production.id);

    const allStages = stagesResult.rows;

    const { stage, isFirstStage } = validateStageAndGetFirst({
      allStages,
      stageCode,
    });

    validateFinishingCanStart({ allStages, stageCode });

    // 5. Calculate selected cycle quantity.
    let inputQty;
    let allocatedQtyBefore = 0;
    let alreadyAllocated = 0;

    if (isFirstStage) {
      const allocatedResult = await findAllocatedQuantity(
        client,
        production.so_no,
        production.sku_code,
      );

      allocatedQtyBefore = Number(allocatedResult.rows[0]?.allocated_qty || 0);

      alreadyAllocated = Number(production.actual_cycle_production_qty || 0);

      // Exclude this cycle's own allocation to calculate
      // how much quantity can belong to this cycle.
      const allocatedByOtherCycles = Math.max(
        allocatedQtyBefore - alreadyAllocated,
        0,
      );

      const availableForThisCycle = Math.max(
        totalTarget - allocatedByOtherCycles,
        0,
      );

      if (alreadyAllocated > 0) {
        // An allocated cycle is locked. Never change its quantity.
        if (
          productionQty !== undefined &&
          productionQty !== null &&
          String(productionQty).trim() !== "" &&
          Math.abs(Number(productionQty) - alreadyAllocated) > 0.001
        ) {
          throw createProductionError(
            400,
            `This cycle is already allocated ${alreadyAllocated}m. Its quantity cannot be changed.`,
          );
        }

        inputQty = alreadyAllocated;
      } else {
        // New allocation: do not allow allocation beyond the SO target.
        const savedFirstTimeQty = Number(
          production.first_time_production_qty || 0,
        );

        const availableQty =
          savedFirstTimeQty > 0
            ? Math.min(savedFirstTimeQty, availableForThisCycle)
            : availableForThisCycle;

        if (availableQty <= 0) {
          throw createProductionError(
            400,
            `Production target exhausted. Target: ${totalTarget}m, already allocated: ${allocatedQtyBefore}m. No more quantity can be allocated to a new cycle.`,
          );
        }

        const selectedQty = Number(productionQty);

        if (
          productionQty === undefined ||
          productionQty === null ||
          String(productionQty).trim() === "" ||
          !Number.isFinite(selectedQty) ||
          selectedQty <= 0
        ) {
          throw createProductionError(
            400,
            "Enter a valid cycle production quantity greater than 0.",
          );
        }

        if (selectedQty > availableQty) {
          throw createProductionError(
            400,
            `Selected quantity ${selectedQty}m exceeds the available quantity ${availableQty}m. SO target: ${totalTarget}m; already allocated: ${allocatedQtyBefore}m.`,
          );
        }

        inputQty = validateFirstStageQuantity({
          productionQty: selectedQty,
          existingInputQty: 0,
          availableQty,
        });

        // Validate helper output too.
        if (
          !Number.isFinite(Number(inputQty)) ||
          Number(inputQty) <= 0 ||
          Number(inputQty) > availableQty
        ) {
          throw createProductionError(
            400,
            `Invalid cycle quantity. Maximum available quantity is ${availableQty}m.`,
          );
        }
      }
    } else {
      inputQty = validateOtherStageQuantity({
        stageCode,
        inputQty: stage.input_qty,
      });
    }

    const updatedBy = getUpdatedBy(user);

    // 6. Save the cycle allocation exactly once.
    if (isFirstStage) {
      if (alreadyAllocated <= 0) {
        const allocationResult = await client.query(
          `
            UPDATE production_master
            SET
              actual_cycle_production_qty = $1,
              cycle_remaining_production_qty = $1,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
              AND COALESCE(actual_cycle_production_qty, 0) = 0
              AND status = 'PENDING'
            RETURNING id
          `,
          [inputQty, production.id],
        );

        if (!allocationResult.rowCount) {
          throw createProductionError(
            409,
            "Cycle allocation changed. Refresh and try again.",
          );
        }

        // Initialize this cycle's stage quantities.
        await updateAllStagesQuantity(client, {
          productionId: production.id,
          inputQty,
          updatedBy,
        });
      }
    }

    // Start only the requested stage.
    await startStageById(client, {
      stageId: stage.id,
      inputQty,
      updatedBy,
    });

    await markProductionInProgress(client, production.id);

    let nextCycleId = null;
    let nextCycleCreated = false;
    let remainingQty = null;

    // 7. Refresh remaining order allocation and next cycle.
    if (isFirstStage) {
      const updatedAllocationResult = await findAllocatedQuantity(
        client,
        production.so_no,
        production.sku_code,
      );

      const totalAllocated = Number(
        updatedAllocationResult.rows[0]?.allocated_qty || 0,
      );

      // Remaining quantity must never be negative.
      remainingQty = Math.max(totalTarget - totalAllocated, 0);

      // Refresh packed-versus-allocated balance for all cycles.
      await updateOrderQuantities(client, {
        soNo: production.so_no,
        skuCode: production.sku_code,
        remainingQty,
      });

      // IMPORTANT:
      // If the complete SO target has already been allocated,
      // do not create or replenish another cycle.
      if (remainingQty > 0) {
        const pendingCycleResult = await findPendingCycle(client, {
          soNo: production.so_no,
          skuCode: production.sku_code,
          excludeId: production.id,
        });

        if (pendingCycleResult.rowCount > 0) {
          const pendingCycle = pendingCycleResult.rows[0];

          await client.query(
            `
              UPDATE production_master
              SET
                first_time_production_qty = $1,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
                AND COALESCE(actual_cycle_production_qty, 0) = 0
                AND status = 'PENDING'
            `,
            [remainingQty, pendingCycle.id],
          );

          nextCycleId = pendingCycle.cycle_id;
        } else {
          const cycleRowsResult = await findCycleIds(
            client,
            production.so_no,
            production.sku_code,
          );

          nextCycleId = getNextCycleId(
            production.so_no,
            production.sku_code,
            cycleRowsResult.rows.map((row) => row.cycle_id),
          );

          const newMasterResult = await insertProductionCycle(client, {
            production,
            nextCycleId,
            totalTarget,
            remainingQty,
          });

          const newProductionId = newMasterResult.rows[0].id;

          await insertCycleStages(client, {
            productionId: newProductionId,
            allStages,
          });

          nextCycleCreated = true;
        }
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return {
      productionId: production.id,
      cycleID: production.cycle_id,
      stage: stageCode,
      inputQty,
      allocatedCycleQty: isFirstStage ? inputQty : undefined,
      remainingOrderQty: remainingQty,
      status: "IN_PROGRESS",
      nextCycleId,
      nextCycleCreated,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("startProduction rollback failed:", rollbackError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
};

// Update production order committed date (PostgreSQL)
export const updateProductionOrderService = async ({
  cycleID,
  division,
  committedDate,
  updatedBy,
}) => {
  const client = await pool.connect();

  try {
    if (!cycleID || !division || !committedDate) {
      throw new Error("Cycle ID, division and committed date are required");
    }

    const normalizedDivision = String(division).trim().toLowerCase();

    await client.query("BEGIN");

    // 1. Find and update production order
    const productionResult = await client.query(
      `
        UPDATE production_master
        SET
          commited_date = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE TRIM(cycle_id) = TRIM($2)
          AND LOWER(division) = $3
        RETURNING id, so_no, sku_code, cycle_id, division
      `,
      [committedDate, cycleID, normalizedDivision],
    );

    if (productionResult.rowCount === 0) {
      throw new Error(`Production order not found for Cycle ID: ${cycleID}`);
    }

    const productionOrder = productionResult.rows[0];
    const { so_no: soNo, sku_code: skuCode } = productionOrder;

    if (!soNo || !skuCode) {
      throw new Error(`SO No or SKU code missing for Cycle ID: ${cycleID}`);
    }

    // 2. Update the matching sales item
    const salesResult = await client.query(
      `
        UPDATE sales_items AS si
        SET
          committed_date = $1
        FROM sales_orders AS so
        WHERE si.sales_order_id = so.id
          AND TRIM(so.so_no) = TRIM($2)
          AND TRIM(si.sku_code) = TRIM($3)
        RETURNING si.id
      `,
      [committedDate, soNo, skuCode],
    );

    if (salesResult.rowCount === 0) {
      throw new Error(
        `Sales item not found for SO No: ${soNo}, SKU: ${skuCode}`,
      );
    }

    await client.query("COMMIT");

    return {
      cycleID,
      division: productionOrder.division,
      soNo,
      skuCode,
      committedDate,
      updatedBy,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("updateProductionOrderService Error:", error);

    throw new Error(
      error?.message || "Failed to update production order committed date",
    );
  } finally {
    client.release();
  }
};

export const allcyclesCompletedPendingOrders = async (division) => {
  try {
    const query = `
    WITH cycle_data AS (
    SELECT
        pm.id AS production_id,
        pm.sales_order_id,
        pm.so_no,
        pm.sku_code,
        pm.customer,
        pm.production_target_qty,
        pm.so_qty,
        pm.division,
        pm.status AS cycle_status,

        COALESCE(first_stage.input_qty, 0) AS cycle_input_qty,

        COALESCE(packing.actual_qty_at_packing, 0)
            AS actual_packed_qty

    FROM production_master pm

    LEFT JOIN LATERAL (
        SELECT psr.input_qty
        FROM production_stage_runs psr
        WHERE psr.production_process_id = pm.id
          AND psr.stage_code IN ('JOB_WORK', 'WARPING')
        ORDER BY
            CASE psr.stage_code
                WHEN 'JOB_WORK' THEN 1
                WHEN 'WARPING' THEN 2
            END
        LIMIT 1
    ) first_stage ON TRUE

    LEFT JOIN production_stage_runs packing
        ON packing.production_process_id = pm.id
       AND packing.stage_code = 'PACKING'
),

production_summary AS (
    SELECT
        sales_order_id,
        so_no,
        sku_code,

        MAX(customer) AS customer,
        MAX(division) AS division,
        MAX(so_qty) AS so_qty,
        MAX(production_target_qty) AS cycle_target_qty,

        SUM(cycle_input_qty) AS total_cycle_input_qty,
        SUM(actual_packed_qty) AS total_actual_packed_qty

    FROM cycle_data
    GROUP BY
        sales_order_id,
        so_no,
        sku_code
)

SELECT
    so.id AS sales_order_id,
    so.so_no,
    ps.customer,
    si.sku_code,
    si.item_qty AS so_qty,
    si.production_qty,

    ps.total_cycle_input_qty,
    ps.total_actual_packed_qty,

    GREATEST(
        0,
        COALESCE(si.production_qty, 0)
            - ps.total_actual_packed_qty
    ) AS pending_production_qty,

    ps.division

FROM production_summary ps

JOIN sales_orders so
    ON so.id = ps.sales_order_id

JOIN sales_items si
    ON si.sales_order_id = so.id
   AND si.sku_code = ps.sku_code

WHERE
    COALESCE(si.production_qty, 0)
        > ps.total_actual_packed_qty

    AND COALESCE(si.production_qty, 0)
        = ps.total_cycle_input_qty
    AND UPPER(ps.division) = UPPER($1)    

ORDER BY so.created_at DESC;
    `;

    const result = await pool.query(query, [division]);
    if (result.rowCount === 0) {
      return [];
    }

    const data = result.rows;
    return data;
  } catch (error) {
    console.error(
      "Error during get all cycles completed pending orders",
      error.message,
    );
    throw new Error(
      error.message || "Error during get all cycles completed pending orders",
    );
  }
};
