import { sendResponse } from "../../helpers/sql/global.helper.js";
import pool from "../../config/postgresDB.js";
import { DAILY_TASKS_TYPES } from "../../constants/dailyTask.constant.js";
import { createTaskService } from "../../services/sql/daily_task.service.js";

export const createTask = async (req, res) => {
  try {
    const { description, department, task_type, due_date, user_id } = req.body;
console.log("Received request body:", req.body); // Debugging line
    //  required field validation
    if (!description || !department || !task_type || !user_id) {
      return sendResponse({
        res,
        statusCode: 400,
        message:
          "Missing required fields: description, department, task_type, due_date",
      });
    }

    if (!DAILY_TASKS_TYPES.includes(String(task_type).trim().toLowerCase())) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Invalid task type",
      });
    }

    if (task_type === DAILY_TASKS_TYPES[1] && !due_date) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Due date is required for delegation tasks",
      });
    }

    const result = await createTaskService({
      description,
      department,
      task_type,
      due_date,
      user_id,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Task created successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err || "Internal server error during create task");
    return sendResponse({
      res,
      statusCode: 500,
      message: `${err.message || "Internal server error during create task"}`,
    });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const query = `
SELECT * FROM daily_tasks
ORDER BY created_at DESC
`;

    const result = await pool.query(query);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tasks fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err || "Internal server error during get all tasks");
    return sendResponse({
      res,
      statusCode: 500,
      message: `${err.message || "Internal server error during get all tasks"}`,
    });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    if (!task_id) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Task ID is required",
      });
    }
    const query = `DELETE FROM daily_tasks WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [task_id]);

    if (result.rowCount === 0) {
      return sendResponse({
        res,
        statusCode: 404,
        message: "Task not found",
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Task deleted successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err || "Internal server error during delete task");
    return sendResponse({
      res,
      statusCode: 500,
      message: `${err.message || "Internal server error during delete task"}`,
    });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    if (!task_id) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Task ID is required",
      });
    }
    const { description, department, task_type, due_date } = req.body;
    if (!description && !department && !task_type && !due_date) {
      return sendResponse({
        res,
        statusCode: 400,
        message:
          "At least one field (description, department, task_type, due_date) is required for update",
      });
    }

    const query = `UPDATE daily_tasks
        SET description = COALESCE($1, description),
            department = COALESCE($2, department),
            task_type = COALESCE($3, task_type),
            due_date = COALESCE($4, due_date)
        WHERE id = $5
        RETURNING *`;
    const result = await pool.query(query, [
      description,
      department,
      task_type,
      due_date,
      task_id,
    ]);

    if (result.rowCount === 0) {
      return sendResponse({
        res,
        statusCode: 404,
        message: "Task not found",
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Task updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err || "Internal server error during update task");
    return sendResponse({
      res,
      statusCode: 500,
      message: `${err.message || "Internal server error during update task"}`,
    });
  }
};

export const getTasksByUserId = async (req, res) => {
  try {
    console.log("Received request for tasks by user ID:", req.user); // Debugging line
    const { userID } = req.user;
    if (!userID) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "User ID is required",
      });
    }

    const query = `
SELECT * FROM daily_tasks
WHERE user_id =$1
AND task_type='daily_task'
ORDER BY created_at DESC`;

    const result = await pool.query(query, [userID]);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tasks fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err || "Internal server error during get tasks by user id");
    return sendResponse({
      res,
      statusCode: 500,
      message: `${err.message || "Internal server error during get tasks by user id"}`,
    });
  }
};



export const completeDailyTask = async (req, res) => {
  const client = await pool.connect();

  try {
    const { taskId } = req.body;
    const { userID } = req.user;

    if (!taskId) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Task ID is required",
      });
    }

    if (!userID) {
      return sendResponse({
        res,
        statusCode: 401,
        message: "Unauthorized user",
      });
    }

    await client.query("BEGIN");

    // Lock the task row to prevent concurrent completion
    const checkResult = await client.query(
      `SELECT id, user_id, task_type, effective_due_date, is_active
       FROM daily_tasks
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [taskId, userID]
    );

    if (checkResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return sendResponse({
        res,
        statusCode: 404,
        message: "Task not found",
      });
    }

    const taskData = checkResult.rows[0];
    const task_type = taskData.task_type;

    if (!DAILY_TASKS_TYPES.includes(task_type)) {
      await client.query("ROLLBACK");

      return sendResponse({
        res,
        statusCode: 400,
        message: "Invalid task type",
      });
    }

    // Delegation task cannot be completed again
    if (
      task_type === "delegation_task" &&
      !taskData.is_active
    ) {
      await client.query("ROLLBACK");

      return sendResponse({
        res,
        statusCode: 409,
        message: "Delegation task is already completed",
      });
    }

    let taskDate;

    if (task_type === "daily_task") {
      // India business date
      const dateResult = await client.query(
        `SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS task_date`
      );

      taskDate = dateResult.rows[0].task_date;
    } else {
      taskDate = taskData.effective_due_date;
    }

    if (!taskDate) {
      await client.query("ROLLBACK");

      return sendResponse({
        res,
        statusCode: 400,
        message: "Task date is missing",
      });
    }

    // Insert completion log
    const result = await client.query(
      `INSERT INTO daily_tasks_logs
       (task_id, task_type, task_date, completed_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [taskId, task_type, taskDate]
    );

    // Deactivate completed delegation task
    if (task_type === "delegation_task") {
      await client.query(
        `UPDATE daily_tasks
         SET is_active = FALSE,
             updated_at = NOW()
         WHERE id = $1`,
        [taskId]
      );
    }

    await client.query("COMMIT");

    return sendResponse({
      res,
      statusCode: 200,
      message: "Task completed successfully",
      data: result.rows[0],
    });

  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Complete task error:", err);

    if (err.code === "23505") {
      return sendResponse({
        res,
        statusCode: 409,
        message: "Task is already completed for today",
      });
    }

    return sendResponse({
      res,
      statusCode: 500,
      message: err.message || "Internal server error",
    });

  } finally {
    client.release();
  }
};


export const getPerformanceOfEmployee = async (req, res) => {
  try {
    const { startDate, endDate, userID } = req.query;

    // 1. VALIDATION
    if (!userID || !startDate || !endDate) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "userID, startDate and endDate are required",
      });
    }

    const normalizedUserID = String(userID).trim();

    const isValidDate = (date) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

      const parsed = new Date(`${date}T00:00:00Z`);

      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date
      );
    };

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    if (startDate > endDate) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Start date cannot be after end date",
      });
    }

    // 2. FETCH PERFORMANCE OCCURRENCES
    const query = `
      WITH date_range AS (
        SELECT d::date AS task_date
        FROM generate_series(
          $2::date::timestamp,
          $3::date::timestamp,
          INTERVAL '1 day'
        ) AS d
      ),

      daily_occurrences AS (
        SELECT
          t.id AS task_id,
          t.description AS task_name,
          t.user_id AS assigned_to,
          t.department,
          dr.task_date,
          'daily_task' AS task_type
        FROM daily_tasks t
        CROSS JOIN date_range dr
        WHERE
          t.user_id = $1
          AND t.task_type = 'daily_task'
          AND t.start_date::date <= dr.task_date
          AND (
            t.is_active = TRUE
            OR EXISTS (
              SELECT 1
              FROM daily_tasks_logs l
              WHERE l.task_id = t.id
                AND l.task_type = 'daily_task'
                AND l.task_date = dr.task_date
            )
          )
          AND EXTRACT(DOW FROM dr.task_date) <> 0
          AND NOT EXISTS (
            SELECT 1
            FROM company_holidays h
            WHERE h.holiday_date = dr.task_date
          )
      ),

      delegation_occurrences AS (
        SELECT
          t.id AS task_id,
          t.description AS task_name,
          t.user_id AS assigned_to,
          t.department,
          COALESCE(t.effective_due_date, t.due_date) AS task_date,
          'delegation_task' AS task_type
        FROM daily_tasks t
        WHERE
          t.user_id = $1
          AND t.task_type = 'delegation_task'
          AND t.start_date::date <= $3::date
          AND COALESCE(t.effective_due_date, t.due_date) >= $2::date
      ),

      all_occurrences AS (
        SELECT * FROM daily_occurrences
        UNION ALL
        SELECT * FROM delegation_occurrences
      ),

      performance_logs AS (
        SELECT
          o.task_id,
          o.task_name,
          o.assigned_to,
          o.department,
          o.task_date,
          o.task_type,
          CASE
            WHEN l.id IS NOT NULL THEN 'COMPLETED'
            ELSE 'NOT_COMPLETED'
          END AS status,
          l.completed_at
        FROM all_occurrences o
        LEFT JOIN daily_tasks_logs l
          ON l.task_id = o.task_id
          AND l.task_type = o.task_type
          AND (
            (
              o.task_type = 'daily_task'
              AND l.task_date = o.task_date
            )
            OR
            (
              o.task_type = 'delegation_task'
            )
          )
      )

      SELECT
        task_id,
        task_name,
        assigned_to,
        department,
        task_date,
        task_type,
        status,
        completed_at
      FROM performance_logs
      ORDER BY task_date ASC, task_id ASC;
    `;

    const result = await pool.query(query, [
      normalizedUserID,
      startDate,
      endDate,
    ]);

    // 3. FORMAT PERFORMANCE LOGS
    const performanceLogs = result.rows.map((row) => ({
      taskID: String(row.task_id),
      taskName: row.task_name,
      assignedTo: row.assigned_to,
      department: row.department,
      taskDate: row.task_date,
      taskType: row.task_type,
      status: row.status,
      completedAt: row.completed_at,
    }));

    // 4. SUMMARY
    const assigned = performanceLogs.length;

    const completed = performanceLogs.filter(
      (task) => task.status === "COMPLETED"
    ).length;

    const pending = assigned - completed;

    const overdueTasks = performanceLogs.filter(
      (task) =>
        task.status === "NOT_COMPLETED" &&
        new Date(`${task.taskDate}T00:00:00`) <
          new Date(
            new Date().toLocaleDateString("en-CA", {
              timeZone: "Asia/Kolkata",
            }) + "T00:00:00"
          )
    );

    const completionPercentage =
      assigned > 0
        ? Number(((completed / assigned) * 100).toFixed(2))
        : 0;

    const pendingTasks = performanceLogs.filter(
      (task) => task.status === "NOT_COMPLETED"
    );

    // 5. FINAL RESPONSE
    return sendResponse({
      res,
      statusCode: 200,
      message: "Employee performance fetched successfully",
      data: {
        userID: normalizedUserID,
        startDate,
        endDate,

        summary: {
          assigned,
          completed,
          pending,
          overdue: overdueTasks.length,
          onTime: 0,
          late: 0,
          completionPercentage,
          score: completionPercentage,
        },

        pendingTasks,
        logs: performanceLogs,
      },
    });

  } catch (error) {
    console.error("Get employee performance error:", error);

    return sendResponse({
      res,
      statusCode: 500,
      message:
        error.message ||
        "Internal server error while fetching employee performance",
    });
  }
};


export const getAllActiveDelegationTask = async(req,res)=>{
  try{
    const {userID} = req.user;
    
    if(!userID){
      return sendResponse({
        res,
        statusCode:400,
        message:"user ID is required "
      })
    }

    const query = `
    SELECT dt.* FROM daily_tasks dt
    WHERE dt.user_id = $1
    AND dt.task_type = 'delegation_task'
    AND dt.is_active = TRUE
    AND NOT EXISTS(
    SELECT 1
    FROM daily_tasks_logs dl
    WHERE dl.task_id = dt.id
    AND dl.task_type = 'delegation_task')
    ORDER BY dt.due_date ASC, dt.created_at DESC;
    `

    const result = await pool.query(query,[userID]);
    console.log("resultsss :",result.rows)
    return sendResponse({
      res,
      statusCode:200,
      message:"Active delegation tasks fetced successfully",
      data:result.rows,
    })
  }catch(err){
console.error("Get active delegation tasks error:", err);

    return sendResponse({
      res,
      statusCode: 500,
      message: err.message || "Internal server error",
    });
  }
  }
