import { USER_COLUMNS } from "../constants/userColumns.js";
import { getUsers } from "../services/googleSheets.js";

export const login = async (req, res) => {
  try {
    const { role, division, password } = req.body;
    console.log("body",req.body)

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!role || !division || !password) {
      return res.status(400).json({
        success: false,

        message: "Role, Division and Password are required",
      });
    }

    // ==========================================
    // GET USERS
    // ==========================================

    const users = await getUsers();

    // Remove header row

    const rows = users.slice(1);

    // ==========================================
    // FIND USER
    // ==========================================

    const user = rows.find((row) => {
  const userRole = String(row[USER_COLUMNS.ROLE] || "")
    .trim()
    .toLowerCase();

  const userDivision = String(row[USER_COLUMNS.DIVISION] || "")
    .trim()
    .toLowerCase();

  const userPassword = String(row[USER_COLUMNS.PASSWORD] || "").trim();

  const userStatus = String(row[USER_COLUMNS.STATUS] || "")
    .trim()
    .toLowerCase();


  return (
    userRole === role.trim().toLowerCase() &&
    userDivision === division.trim().toLowerCase() &&
    userPassword === password.trim() &&
    userStatus === "true" 
  );
});

    // ==========================================
    // INVALID LOGIN
    // ==========================================

    if (!user) {
      return res.status(401).json({
        success: false,

        message: "Invalid Role, Division or Password",
      });
    }

    // ==========================================
    // SUCCESS
    // ==========================================
    return res.status(200).json({
      success: true,

      message: "Login Successful",

      user: {
        name: user[USER_COLUMNS.NAME],

        role: user[USER_COLUMNS.ROLE],

        division: user[USER_COLUMNS.DIVISION],
        userID: user[USER_COLUMNS.USER_ID],
      },
    });
  } catch (error) {
    console.error("Error in login", error);
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    console.time("🔥 TOTAL getAllUsers");

    console.time("⚡ getUsers");
    const allUsers = await getUsers();
    console.timeEnd("⚡ getUsers");

    console.time("🔄 map users");

    const data = allUsers.slice(1).map((row) => ({
      name: row[USER_COLUMNS.NAME],
      role: row[USER_COLUMNS.ROLE],
      division: row[USER_COLUMNS.DIVISION],
      userID: row[USER_COLUMNS.USER_ID],
      status: row[USER_COLUMNS.STATUS] === "TRUE",
    }));

    console.timeEnd("🔄 map users");

    console.timeEnd("🔥 TOTAL getAllUsers");

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get users",
    });
  }
};
