import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../../config/postgresDB.js";
import { sendResponse } from "../../helpers/sql/global.helper.js";
import { requireAdmin } from "../../middleware/auth.middleware.js";
import { ALLOWED_DIVISIONS } from "../../constants/userColumns.js";

// --------------------------------------------------
// CREATE USER (No public signup)
// --------------------------------------------------
export const createUser = async (req, res) => {
  try {
  console.log("CONTENT TYPE:", req.headers["content-type"]);
  console.log("BODY:", req.body);

    const {
      userID,
      name,
      password,
      role,
      division = "all",
      department = null,
    } = req.body;

    if (
      typeof userID !== "string" ||
      !userID.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof password !== "string" ||
      password.length < 8 ||
      typeof role !== "string" ||
      !role.trim()
    ) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message:
          "Valid userID, name, role and password (minimum 8 characters) are required",
      });
    }

    const normalizedUserID = userID.trim().toUpperCase();
    const normalizedDivision = String(division).trim().toUpperCase();

    if (!ALLOWED_DIVISIONS.includes(normalizedDivision)) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Division must be all, woven or crochet",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
        INSERT INTO users (
          user_id,
          name,
          password_hash,
          role,
          division,
          department
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          user_id,
          name,
          role,
          division,
          department,
          is_active,
          created_at
      `,
      [
        normalizedUserID,
        name.trim(),
        passwordHash,
        role.trim(),
        normalizedDivision,
        typeof department === "string" ? department.trim() || null : null,
      ],
    );

    return sendResponse({
      res,
      statusCode: 201,
      success: true,
      message: "User created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return sendResponse({
        res,
        statusCode: 409,
        success: false,
        message: "This User ID already exists",
      });
    }

    console.error("createUser error:", error.message);

    return sendResponse({
      res,
      statusCode: 500,
      success: false,
      message: "Failed to create user",
    });
  }
};

// --------------------------------------------------
// DELETE USER (Soft delete)
// --------------------------------------------------
export const deleteUser = async (req, res) => {
  try {

    const userId = Number(req.params.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Valid user ID is required",
      });
    }

    // Prevent admin from disabling their own account.
    if (Number(req.user?.id) === userId) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    const result = await pool.query(
      `
        UPDATE users
        SET
          is_active = FALSE,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND is_active = TRUE
        RETURNING id, user_id, name, is_active
      `,
      [userId],
    );

    if (result.rowCount === 0) {
      return sendResponse({
        res,
        statusCode: 404,
        success: false,
        message: "Active user not found",
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "User deactivated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("deleteUser error:", error.message);

    return sendResponse({
      res,
      statusCode: 500,
      success: false,
      message: "Failed to deactivate user",
    });
  }
};

// --------------------------------------------------
// UPDATE USER
// Password is optional. If supplied, hash it again.
// --------------------------------------------------
export const updateUser = async (req, res) => {
  try {

    const userId = Number(req.params.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Valid user ID is required",
      });
    }

    const { userID, name, password, role, division, department, is_active } =
      req.body;

    if (
      userID === undefined &&
      name === undefined &&
      password === undefined &&
      role === undefined &&
      division === undefined &&
      department === undefined &&
      is_active === undefined
    ) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "At least one field is required to update",
      });
    }

    if (
      userID !== undefined &&
      (typeof userID !== "string" || !userID.trim())
    ) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Invalid User ID",
      });
    }

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Name cannot be empty",
      });
    }

    if (role !== undefined && (typeof role !== "string" || !role.trim())) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Invalid role",
      });
    }

    if (
      password !== undefined &&
      (typeof password !== "string" || password.length < 8)
    ) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    let normalizedDivision;

    if (division !== undefined) {
      normalizedDivision = String(division).trim().toLowerCase();

      if (!["all", "woven", "crochet"].includes(normalizedDivision)) {
        return sendResponse({
          res,
          statusCode: 400,
          success: false,
          message: "Division must be all, woven or crochet",
        });
      }
    }

    if (is_active !== undefined && typeof is_active !== "boolean") {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "is_active must be true or false",
      });
    }

    // Prevent an admin from disabling their own account.
    if (Number(req.user?.id) === userId && is_active === false) {
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    const passwordHash =
      password !== undefined ? await bcrypt.hash(password, 12) : null;

    const result = await pool.query(
      `
        UPDATE users
        SET
          user_id = COALESCE($1, user_id),
          name = COALESCE($2, name),
          password_hash = COALESCE($3, password_hash),
          role = COALESCE($4, role),
          division = COALESCE($5, division),
          department = CASE
            WHEN $6::boolean THEN $7::varchar
            ELSE department
          END,
          is_active = COALESCE($8, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING
          id,
          user_id,
          name,
          role,
          division,
          department,
          is_active,
          updated_at
      `,
      [
        userID !== undefined ? userID.trim().toUpperCase() : null,
        name !== undefined ? name.trim() : null,
        passwordHash,
        role !== undefined ? role.trim() : null,
        normalizedDivision ?? null,
        department !== undefined,
        department === null
          ? null
          : typeof department === "string"
            ? department.trim() || null
            : null,
        is_active ?? null,
        userId,
      ],
    );

    if (result.rowCount === 0) {
      return sendResponse({
        res,
        statusCode: 404,
        success: false,
        message: "User not found",
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "User updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return sendResponse({
        res,
        statusCode: 409,
        success: false,
        message: "This User ID already exists",
      });
    }

    console.error("updateUser error:", error.message);

    return sendResponse({
      res,
      statusCode: 500,
      success: false,
      message: "Failed to update user",
    });
  }
};

// --------------------------------------------------
// LOGIN (PostgreSQL + bcrypt + JWT)
// --------------------------------------------------
export const login = async (req, res) => {
  try {
    const { userID, password } = req.body;
console.log(req.body);
    if (
      typeof userID !== "string" ||
      !userID.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      console.log("code failed here");
      return sendResponse({
        res,
        statusCode: 400,
        success: false,
        message: "User ID and Password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
            console.log("code failed here 2");
      throw new Error("JWT_SECRET is missing");
    }

    const result = await pool.query(
      `
        SELECT
          id,
          user_id,
          name,
          password_hash,
          role,
          division,
          department,
          is_active
        FROM users
        WHERE LOWER(user_id) = LOWER($1)
        LIMIT 1
      `,
      [userID.trim()],
    );

    const user = result.rows[0];
    console.log("user",user);

    if (!user || !user.is_active) {
      return sendResponse({
        res,
        statusCode: 401,
        success: false,
        message: "Invalid User ID or Password",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return sendResponse({
        res,
        statusCode: 401,
        success: false,
        message: "Invalid User ID or Password",
      });
    }

    const token = jwt.sign(
      {
        userID: user.user_id,
        role: user.role,
        division: user.division,
      },
      process.env.JWT_SECRET,
      {
        subject: String(user.id),
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      },
    );

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          userID: user.user_id,
          name: user.name,
          role: user.role,
          division: user.division,
          department: user.department,
        },
      },
    });
  } catch (error) {
    console.error("login error:", error.message);

    return sendResponse({
      res,
      statusCode: 500,
      success: false,
      message: "Login failed",
    });
  }
};


export const getAllUsers = async (req, res) => {
  console.log("🔥 GET ALL USERS CONTROLLER HIT", req.user);

  try {
    console.log("1️⃣ BEFORE DATABASE QUERY");

    const query = `
      SELECT
        id,
        user_id,
        name,
        role,
        division,
        department,
        is_active,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    console.log("2️⃣ DATABASE QUERY SUCCESS", result.rows.length);

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      data: result.rows,
      message: "All users fetched successfully",
    });
  } catch (error) {
    console.error("❌ GET ALL USERS ERROR:", error);

    return sendResponse({
      res,
      statusCode: 500,
      success: false,
      message: "Error during get all users",
    });
  }
};
