import express from "express";
import pool from "../config/postgresDB.js";

const router = express.Router();

router.get("/db-test", async (req, res) => {
  try {
    // 1. Check DB connection
    const connectionResult = await pool.query(`
      SELECT
        current_database(),
        current_user,
        current_schema()
    `);

    console.log("SQL CONNECTION:", connectionResult.rows[0]);

    // 2. Check product_master
    const productMasterResult = await pool.query(`
      SELECT
        table_schema,
        table_name
      FROM information_schema.tables
      WHERE table_name = 'product_master'
    `);

    console.log("PRODUCT MASTER:", productMasterResult.rows);

    // 3. Get all tables from public schema
    const tablesResult = await pool.query(`
      SELECT
        table_schema,
        table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("PUBLIC TABLES:");

    tablesResult.rows.forEach((table) => {
      console.log(`${table.table_schema}.${table.table_name}`);
    });

    return res.status(200).json({
      success: true,
      connection: connectionResult.rows[0],
      productMaster: productMasterResult.rows,
      publicTables: tablesResult.rows,
    });

  } catch (error) {
    console.error("❌ DB TEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;