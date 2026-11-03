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