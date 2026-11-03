import pool from "../../config/postgresDB.js";

export const generateNextSoNo = async () => {
  try {
    const query = `
      SELECT COALESCE(
        MAX(
          CAST(
            SUBSTRING(so_no FROM 4) AS INTEGER
          )
        ),
        0
      ) AS "maxNumber"
      FROM sales_orders
      WHERE so_no LIKE 'ANF%';
    `;

    const { rows } = await pool.query(query);

    const maxNumber = Number(rows[0]?.maxNumber) || 0;

    const nextSo =
      `ANF${String(maxNumber + 1).padStart(5, "0")}`;

    console.log("🔥 MAX SO NUMBER:", maxNumber);
    console.log("🔥 GENERATED SO:", nextSo);

    return nextSo;

  } catch (error) {
    console.error("generateNextSoNo Error:", error);
    throw error;
  }
};

