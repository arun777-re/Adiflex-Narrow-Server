import pool from "../../config/postgresDB.js";
import { DAILY_TASKS_TYPES } from "../../constants/dailyTask.constant.js";
import { sendResponse } from "../../helpers/sql/global.helper.js";
import {getPreviousWorkingDay} from '../../utils/dailyTask.utils.js';
import { sendNotification } from "../../helpers/notificationHelper.js";


export const createTaskService = async ({
  description,
  department,
  task_type,
  due_date,
  user_id,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Check whether user exists
    const userResponse = await client.query(
      `SELECT user_id FROM users WHERE user_id = $1`,
      [user_id]
    );

    if (userResponse.rowCount === 0) {
      throw new Error("Invalid user_id/user does not exist");
    }

    let effectiveDueDate = null;

    // 2. Calculate effective deadline only for delegation task
    if (task_type === "delegation_task") {
      const deadlineResponse = await getPreviousWorkingDay({ dueDate: due_date, client });
      effectiveDueDate = deadlineResponse;
    }

    // 3. Insert task
    const query = `
      INSERT INTO daily_tasks (
        description,
        department,
        task_type,
        due_date,
        effective_due_date,
        user_id,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *;
    `;

    const values = [
      description.trim(),
      department,
      task_type,
      task_type === "delegation_task" ? due_date : null,
      effectiveDueDate,
      user_id,
    ];

    const result = await client.query(query, values);

    await client.query("COMMIT");

    const data = result.rows[0];
    if(task_type === DAILY_TASKS_TYPES[1]){
      void sendNotification({
          userID:user_id,
          type: "DELEGATION",
          title: "New Delegation Task",
          message: description,
          reference: data.id,
        }).catch((err)=>{
          console.error("❌ Delegation notification failed:", err)
        });
    }

    return data;

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in createTaskService:", error);
    throw error;

  } finally {
    client.release();
  }
};

export const getAllEmployeesPerformanceService = async ({
  startDate,
  endDate,
}) => {
  const query = `
    WITH employee_list AS (
      SELECT
        user_id,
        name,
        department
      FROM users
      WHERE LOWER(TRIM(role)) = 'employee'
    ),

    date_range AS (
      SELECT d::date AS task_date
      FROM generate_series(
        $1::date::timestamp,
        $2::date::timestamp,
        INTERVAL '1 day'
      ) AS d
    ),

    daily_occurrences AS (
      SELECT
        t.id AS task_id,
        t.user_id,
        t.department,
        dr.task_date,
        'daily_task'::varchar AS task_type
      FROM daily_tasks t
      CROSS JOIN date_range dr
      WHERE
        t.task_type = 'daily_task'
        AND t.start_date::date <= dr.task_date
        AND (
          t.is_active = TRUE
          OR EXISTS (
            SELECT 1
            FROM daily_tasks_logs l
            WHERE
              l.task_id = t.id
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
        t.user_id,
        t.department,
        COALESCE(t.effective_due_date, t.due_date) AS task_date,
        'delegation_task'::varchar AS task_type
      FROM daily_tasks t
      WHERE
        t.task_type = 'delegation_task'
        AND t.start_date::date <= $2::date
        AND COALESCE(t.effective_due_date, t.due_date) >= $1::date
    ),

    all_occurrences AS (
      SELECT * FROM daily_occurrences

      UNION ALL

      SELECT * FROM delegation_occurrences
    ),

    performance_status AS (
      SELECT
        o.user_id,
        o.task_id,
        o.task_type,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM daily_tasks_logs l
            WHERE
              l.task_id = o.task_id
              AND l.task_type = o.task_type
              AND (
                o.task_type = 'delegation_task'
                OR l.task_date = o.task_date
              )
          )
          THEN 'COMPLETED'
          ELSE 'NOT_COMPLETED'
        END AS status
      FROM all_occurrences o
    ),

    employee_totals AS (
      SELECT
        user_id,
        COUNT(*)::integer AS assigned,
        COUNT(*) FILTER (
          WHERE status = 'COMPLETED'
        )::integer AS completed,
        COUNT(*) FILTER (
          WHERE status = 'NOT_COMPLETED'
        )::integer AS not_done
      FROM performance_status
      GROUP BY user_id
    )

    SELECT
      e.user_id,
      e.name AS employee_name,
      e.department,
      COALESCE(et.assigned, 0)::integer AS assigned,
      COALESCE(et.completed, 0)::integer AS completed,
      COALESCE(et.not_done, 0)::integer AS not_done
    FROM employee_list e
    LEFT JOIN employee_totals et
      ON et.user_id = e.user_id
    ORDER BY e.name ASC;
  `;

  const result = await pool.query(query, [startDate, endDate]);

  const employees = result.rows.map((row) => {
    const assigned = Number(row.assigned);
    const completed = Number(row.completed);
    const notDone = Number(row.not_done);

    const notDonePercentage =
      assigned > 0
        ? Number((-(notDone / assigned) * 100).toFixed(2))
        : 0;

    const completionPercentage =
      assigned > 0
        ? Number(((completed / assigned) * 100).toFixed(2))
        : 0;

    return {
      userID: row.user_id,
      employeeName: row.employee_name,
      department: row.department || "--",
      assigned,
      completed,
      notDone,
      notDonePercentage,
      completionPercentage,
    };
  });

  const totalAssigned = employees.reduce(
    (sum, employee) => sum + employee.assigned,
    0
  );

  const totalCompleted = employees.reduce(
    (sum, employee) => sum + employee.completed,
    0
  );

  const totalNotDone = employees.reduce(
    (sum, employee) => sum + employee.notDone,
    0
  );

  const overallNotDonePercentage =
    totalAssigned > 0
      ? Number((-(totalNotDone / totalAssigned) * 100).toFixed(2))
      : 0;

  const overallCompletionPercentage =
    totalAssigned > 0
      ? Number(((totalCompleted / totalAssigned) * 100).toFixed(2))
      : 0;

  return {
    startDate,
    endDate,

    summary: {
      totalEmployees: employees.length,
      assigned: totalAssigned,
      completed: totalCompleted,
      notDone: totalNotDone,
      notDonePercentage: overallNotDonePercentage,
      completionPercentage: overallCompletionPercentage,
    },

    employees,
  };
};