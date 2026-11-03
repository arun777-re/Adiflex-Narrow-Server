import pool from "../../config/postgresDB.js";
import { sendResponse } from "../../helpers/sql/global.helper.js";
import {
  allcyclesCompletedPendingOrders,
  completeProductionService,
  startProductionService,
  updateProductionOrderService,
} from "../../services/sql/production.service.js";
import { getCompleteProductionValidationError } from "../../validation/production.validation.js";

// get all production orders for crochet/woven/all

export const getAllProduction = async (req, res) => {
  try {
    const normalizedDivision = String(req.params.division || "")
      .trim()
      .toLowerCase();

    if (!["all", "woven", "crochet"].includes(normalizedDivision)) {
      return res.status(400).json({
        success: false,
        message: "Invalid division. Use all, woven, or crochet.",
      });
    }

    const query = `
      SELECT
        pm.id AS production_id,
        pm.sales_order_id,
        pm.so_no,
        pm.so_qty,
        pm.available_in_stock,
        pm.cycle_id,
        pm.sku_code,
        pm.product_name,

        -- Full sales order target
        pm.production_target_qty,

        -- Cycle allocation and cycle balance
        COALESCE(pm.actual_cycle_production_qty, 0)
          AS actual_cycle_production_qty,
        COALESCE(pm.first_time_production_qty, 0)
          AS first_time_production_qty,
        COALESCE(pm.cycle_remaining_production_qty, 0)
          AS cycle_remaining_production_qty,

        -- Actual packed production for this cycle
        COALESCE(pm.total_production_qty, 0)
          AS total_production_qty,

        pm.division,
        pm.status AS production_status,
        pm.commited_date,
        pm.customer,
        pm.order_type,
        pm.created_at,
        pm.updated_at,

        COALESCE(stage_data.stages, '[]'::jsonb) AS stages

      FROM production_master pm

      LEFT JOIN LATERAL (
        SELECT
          jsonb_agg(
            jsonb_build_object(
              'stage_run_id', psm.id,
              'stage_code', psm.stage_code,
              'input_qty', COALESCE(psm.input_qty, 0),
              'processed_qty', COALESCE(psm.processed_qty, 0),
              'accepted_qty', COALESCE(psm.accepted_qty, 0),
              'wastage_qty', COALESCE(psm.wastage_qty, 0),
              'released_qty', COALESCE(psm.released_qty, 0),
              'actual_qty_at_packing',
                COALESCE(psm.actual_qty_at_packing, 0),
              'status', psm.status,
              'assigned_to', psm.assigned_to,
              'started_at', psm.started_at,
              'completed_at', psm.completed_at
            )
            ORDER BY
              CASE psm.stage_code
                WHEN 'JOB_WORK' THEN 1
                WHEN 'WARPING' THEN 2
                WHEN 'FILLING' THEN 3
                WHEN 'MACHINE' THEN 4
                WHEN 'FINISHING' THEN 5
                WHEN 'QUALITY' THEN 6
                WHEN 'ROLLING' THEN 7
                WHEN 'PACKING' THEN 8
                ELSE 9
              END
          ) AS stages
        FROM production_stage_runs psm
        WHERE psm.production_process_id = pm.id
      ) stage_data ON TRUE

      WHERE
        $1 = 'all'
        OR LOWER(pm.division) = $1

      ORDER BY pm.created_at DESC, pm.id DESC;
    `;

    // Always pass one parameter, including for "all".
    const result = await pool.query(query, [normalizedDivision]);

    return res.status(200).json({
      success: true,
      message: "Production data fetched successfully",
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("getAllProduction ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch production data",
      error: error.message,
    });
  }
};

// Quality / Finishing Supervisor

export const getAllQualitySupervisorOrders = async (req, res) => {
  try {
    const normalizedDivision = String(req.params.division || "all")
      .trim()
      .toLowerCase();

    if (!["all", "woven", "crochet"].includes(normalizedDivision)) {
      return sendResponse({
        res,
        message: "Invalid division. Use all, woven, or crochet.",
        statusCode: 400,
      });
    }

    const query = `
      SELECT
        pm.id AS production_id,
        pm.so_no,
        pm.so_qty,
        pm.available_in_stock,
        pm.cycle_id,
        pm.sku_code,
        pm.product_name,

        -- Full SO target
        pm.production_target_qty,

        -- New cycle allocation fields
        COALESCE(pm.actual_cycle_production_qty, 0)
          AS actual_cycle_production_qty,
        COALESCE(pm.first_time_production_qty, 0)
          AS first_time_production_qty,
        COALESCE(pm.cycle_remaining_production_qty, 0)
          AS cycle_remaining_production_qty,

        -- Actual packed quantity for this cycle
        COALESCE(pm.total_production_qty, 0)
          AS total_production_qty,

        pm.division,
        pm.status AS production_status,
        pm.commited_date,
        pm.customer,
        pm.order_type,
        pm.created_at,
        pm.updated_at,

        COALESCE(stage_data.stages, '[]'::jsonb) AS stages

      FROM production_master pm

      LEFT JOIN LATERAL (
        SELECT
          jsonb_agg(
            jsonb_build_object(
              'stage_run_id', psm.id,
              'stage_code', psm.stage_code,
              'input_qty', COALESCE(psm.input_qty, 0),
              'processed_qty', COALESCE(psm.processed_qty, 0),
              'accepted_qty', COALESCE(psm.accepted_qty, 0),
              'wastage_qty', COALESCE(psm.wastage_qty, 0),
              'released_qty', COALESCE(psm.released_qty, 0),
              'remaining_qty',COALESCE(psm.remaining_qty,0),
              'actual_qty_at_packing',
                COALESCE(psm.actual_qty_at_packing, 0),
              'status', psm.status,
              'assigned_to', psm.assigned_to,
              'started_at', psm.started_at,
              'completed_at', psm.completed_at
            )
            ORDER BY
              CASE psm.stage_code
                WHEN 'JOB_WORK' THEN 1
                WHEN 'WARPING' THEN 2
                WHEN 'FILLING' THEN 3
                WHEN 'MACHINE' THEN 4
                WHEN 'FINISHING' THEN 5
                WHEN 'QUALITY' THEN 6
                WHEN 'ROLLING' THEN 7
                WHEN 'PACKING' THEN 8
                ELSE 9
              END
          ) AS stages
        FROM production_stage_runs psm
        WHERE psm.production_process_id = pm.id
      ) stage_data ON TRUE

      WHERE
        (
          $1 = 'all'
          OR LOWER(pm.division) = $1
        )

        AND (
          -- FINISHING:
          -- Machine has released quantity and Finishing
          -- has not yet completed.
          EXISTS (
            SELECT 1
            FROM production_stage_runs finishing
            JOIN production_stage_runs machine
              ON machine.production_process_id =
                 finishing.production_process_id

            WHERE finishing.production_process_id = pm.id
              AND finishing.stage_code = 'FINISHING'
              AND finishing.status IN (
                'PENDING',
                'IN_PROGRESS',
                'PARTIALLY_RELEASED'
              )
              AND machine.stage_code = 'MACHINE'
              AND COALESCE(machine.released_qty, 0) > 0
          )

          OR

          -- QUALITY:
          -- Finishing is completed and Quality is still active.
          EXISTS (
            SELECT 1
            FROM production_stage_runs quality
            JOIN production_stage_runs finishing
              ON finishing.production_process_id =
                 quality.production_process_id

            WHERE quality.production_process_id = pm.id
              AND quality.stage_code = 'QUALITY'
              AND quality.status IN (
                'PENDING',
                'IN_PROGRESS',
                'PARTIALLY_RELEASED'
              )
              AND finishing.stage_code = 'FINISHING'
              AND finishing.status = 'COMPLETED'
          )
        )

      ORDER BY pm.created_at DESC, pm.id DESC;
    `;

    const result = await pool.query(query, [normalizedDivision]);

    return sendResponse({
      res,
      message: "Quality supervisor orders fetched successfully",
      statusCode: 200,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Error during get production orders for quality supervisor:",
      error,
    );

    return sendResponse({
      res,
      message: "Failed to fetch quality supervisor orders",
      statusCode: 500,
    });
  }
};

// Packing Supervisor
export const getAllPackingSupervisorOrders = async (req, res) => {
  try {
    const { division = "all" } = req.params;

    const normalizedDivision = division.toLowerCase();

    if (!["all", "woven", "crochet"].includes(normalizedDivision)) {
      return sendResponse({
        res,
        message: "Invalid division. Use all, woven, or crochet.",
        statusCode: 400,
      });
    }

    const query = `
    
SELECT
  pm.*,
  COALESCE(stage_data.stages, '[]'::jsonb) AS stages
FROM production_master pm

LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    to_jsonb(psr)
    ORDER BY CASE psr.stage_code
      WHEN 'JOB_WORK' THEN 1
      WHEN 'WARPING' THEN 2
      WHEN 'FILLING' THEN 3
      WHEN 'MACHINE' THEN 4
      WHEN 'FINISHING' THEN 5
      WHEN 'QUALITY' THEN 6
      WHEN 'ROLLING' THEN 7
      WHEN 'PACKING' THEN 8
      ELSE 9
    END
  ) AS stages
  FROM production_stage_runs psr
  WHERE psr.production_process_id = pm.id
) stage_data ON TRUE

WHERE
  ($1 = 'all' OR LOWER(pm.division) = $1)
  AND (
    EXISTS (
      SELECT 1
      FROM production_stage_runs rolling
      JOIN production_stage_runs quality
        ON quality.production_process_id = rolling.production_process_id
      WHERE rolling.production_process_id = pm.id
        AND rolling.stage_code = 'ROLLING'
        AND rolling.status IN (
          'PENDING',
          'IN_PROGRESS',
          'PARTIALLY_RELEASED'
        )
        AND quality.stage_code = 'QUALITY'
        AND quality.status IN ('COMPLETED', 'PARTIALLY_RELEASED')
    )
    OR EXISTS (
      SELECT 1
      FROM production_stage_runs packing
      JOIN production_stage_runs rolling
        ON rolling.production_process_id = packing.production_process_id
      WHERE packing.production_process_id = pm.id
        AND packing.stage_code = 'PACKING'
        AND packing.status IN (
          'PENDING',
          'IN_PROGRESS',
          'PARTIALLY_RELEASED'
        )
        AND rolling.stage_code = 'ROLLING'
        AND rolling.released_qty > 0
    )
  )

ORDER BY pm.created_at DESC;

    `;

    const result = await pool.query(query, [normalizedDivision]);
    console.log("QUALITY RESULT:", JSON.stringify(result.rows, null, 2));
    return sendResponse({
      res,
      message: "Packing supervisor orders fetched successfully",
      statusCode: 200,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Error during get production orders for packing supervisor:",
      error,
    );

    return sendResponse({
      res,
      message: error.message,
      statusCode: 500,
    });
  }
};

export const startProduction = async (req, res) => {
  try {
    const data = await startProductionService({
      payload: req.body,
      user: req.user,
    });

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: data.nextCycleCreated
        ? `${data.stage} started successfully. Next cycle created.`
        : `${data.stage} started successfully`,
      data,
    });
  } catch (error) {
    console.error("startProduction error:", error);

    return sendResponse({
      res,
      statusCode: error.statusCode || 500,
      success: false,
      message: error.statusCode ? error.message : "Failed to start production",
    });
  }
};

export const completeProduction = async (req, res) => {
  const user = req.user;
  const payload = req.body || {};

  const validationError = getCompleteProductionValidationError(payload, user);
  if (validationError) {
    return sendResponse({
      res,
      statusCode: validationError.statusCode,
      success: false,
      message: validationError.message,
    });
  }

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const data = await completeProductionService({
      client,
      payload,
      user,
    });

    await client.query("COMMIT");
    transactionStarted = false;

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message:
        data.stageStatus === "COMPLETED"
          ? `${data.completedStage} completed successfully`
          : `${data.completedStage} quantity released successfully`,
      data,
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    console.error("completeProduction error:", error);

    return sendResponse({
      res,
      statusCode: error.statusCode || 500,
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to complete production stage",
    });
  } finally {
    if (client) client.release();
  }
};

// add commited date to order
export const addCommitedDateToOrder = async (req, res) => {
  try {
    const { committedDate, updatedBy, cycleID, division } = req.body;
    console.log("req.body", req.body);
    if (!cycleID) {
      return res.status(400).json({
        success: false,
        message: "Cycle ID is required",
      });
    }

    if (!division) {
      return res.status(400).json({
        success: false,
        message: "Division is required",
      });
    }

    if (!committedDate) {
      return res.status(400).json({
        success: false,
        message: "Committed date is required",
      });
    }

    const updatedOrder = await updateProductionOrderService({
      cycleID,
      division,
      committedDate,
      updatedBy,
    });

    return sendResponse({
      res,
      statusCode: 200,
      message: "commited date added successfully",
      data: updatedOrder,
      success: true,
    });
  } catch (error) {
    console.error("Error during add commited date to order", error);
    return sendResponse({
      res,
      statusCode: 500,
      message: `${error.message}`,
    });
  }
};


// get pending orders whose all cycles are completed and sumof all cycles actualqtyatpacking < sumof all cycles input qty === production_qty
export const getAllCyclesCompletedPendingOrders = async (req,res)=>{
  const {division} = req.params;
  if(!division){
    return sendResponse({
      res,
      statusCode:400,
      success:false,
    message:"Division is required"    })
  }
  try {
    const data = await allcyclesCompletedPendingOrders(division);

    console.log("data coming",data);
    return sendResponse({
      res,
      data:data,
      success:true,
      statusCode:200
    })
  } catch (error) {
    console.error("Error during get all cycles completed pending orders:",error);
    return sendResponse({
      res,
      message:`Error during get all cycles completed pending orders:${error.message}`,
      statusCode:500,
      success:false
    })
  }
}