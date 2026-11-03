import { sendResponse } from "../../helpers/sql/global.helper.js";
import pool from '../../config/postgresDB.js';

export const createHoliday = async (req, res) => {
  try {
    const { holiday_name, holiday_date, description } = req.body;
    console.log("Create holiday request body:", req.body);

    if (!holiday_name?.trim() || !holiday_date) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Holiday name and date are required",
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday_date)) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const query = `
      INSERT INTO company_holidays (
        holiday_name,
        holiday_date,
        description
      )
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const values = [
      holiday_name.trim(),
      holiday_date,
      description?.trim() || null,
    ];

    const result = await pool.query(query, values);

    return sendResponse({
      res,
      statusCode: 201,
      message: "Holiday created successfully",
      data: result.rows[0],
    });

  } catch (err) {
    console.error("Create holiday error:", err);

    if (err.code === "23505") {
      return sendResponse({
        res,
        statusCode: 409,
        message: "Holiday already exists for this date",
      });
    }

    return sendResponse({
      res,
      statusCode: 500,
      message: "Internal server error during create holiday",
    });
  }
};

export const getAllHolidays = async(req,res)=>{
    try{
        const query = `
        SELECT * FROM company_holidays
        ORDER BY holiday_date DESC;
        `;
        const result = await pool.query(query);
        return sendResponse({
            res,
            statusCode: 200,
            message: "Holidays fetched successfully",
            data: result.rows,
        });
    }catch(err){
        console.error(err || "Internal server error during get all holidays");
        return sendResponse({
            res,
            statusCode: 500,
            message: `${err.message || "Internal server error during get all holidays"}`,
        });
    }
}

export const deleteHoliday = async (req, res) => {
  try {
    const { holiday_id } = req.params;

    if (!/^\d+$/.test(holiday_id) || Number(holiday_id) <= 0) {
      return sendResponse({
        res,
        statusCode: 400,
        message: "Invalid holiday ID",
      });
    }

    const query = `
      DELETE FROM company_holidays
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [holiday_id]);

    if (result.rowCount === 0) {
      return sendResponse({
        res,
        statusCode: 404,
        message: "Holiday not found",
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Holiday deleted successfully",
      data: result.rows[0],
    });

  } catch (err) {
    console.error("Delete holiday error:", err);

    return sendResponse({
      res,
      statusCode: 500,
      message: "Internal server error while deleting holiday",
    });
  }
};