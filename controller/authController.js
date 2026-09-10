import { USER_COLUMNS } from "../constants/userColumns.js";
import { getUsers } from "../services/googleSheets.js";

export const login = async (req, res) => {
  try {
    console.log("\n==========================================");
    console.log("🔐 LOGIN REQUEST");
    console.log("==========================================");

    const { userID, password } = req.body;

    console.log("coming request . . . . . . . . . . .. . ", req.body)

    console.log("📥 Login payload:", {
      userID,
      passwordProvided: !!password,
    });

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!userID || !password) {
      console.log("❌ LOGIN VALIDATION FAILED");
      console.log("   userID:", !!userID);
      console.log("   password:", !!password);

      return res.status(400).json({
        success: false,
        message: "User ID and Password are required",
      });
    }

    console.log("✅ Login payload validation passed");

    // ==========================================
    // GET USERS FROM CACHE
    // ==========================================

    console.log("⚡ Fetching users...");

    const users = await getUsers();

    console.log("USERSS",users);

    console.log("👥 Users received:", users.length);
    console.log(
      "👥 User records excluding header:",
      Math.max(users.length - 1, 0)
    );

    // ==========================================
    // NORMALIZE LOGIN DATA
    // ==========================================

    const normalizedUserID = String(userID)
      .trim()
      .toLowerCase();

    const normalizedPassword = String(password).trim();

    console.log("🔎 Searching user...");
    console.log("   User ID:", normalizedUserID);

    // ==========================================
    // FIND USER
    // ==========================================

    const user = users.slice(1).find((row) => {
      const sheetUserID = String(
        row[USER_COLUMNS.USER_ID] || ""
      )
        .trim()
        .toLowerCase();

      const sheetPassword = String(
        row[USER_COLUMNS.PASSWORD] || ""
      ).trim();

      const sheetStatus = String(
        row[USER_COLUMNS.STATUS] || ""
      )
        .trim()
        .toLowerCase();

      return (
        sheetUserID === normalizedUserID &&
        sheetPassword === normalizedPassword &&
        sheetStatus === "true"
      );
    });

    // ==========================================
    // INVALID LOGIN
    // ==========================================

    if (!user) {
      console.log("❌ LOGIN FAILED");
      console.log("   User ID:", normalizedUserID);
      console.log("   Reason: Invalid User ID or Password");
      console.log("==========================================\n");

      return res.status(401).json({
        success: false,
        message: "Invalid User ID or Password",
      });
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    console.log("✅ LOGIN SUCCESS");
    console.log("   User ID:", user[USER_COLUMNS.USER_ID]);
    console.log("   Name:", user[USER_COLUMNS.NAME]);
    console.log("   Role:", user[USER_COLUMNS.ROLE]);
    console.log("   Division:", user[USER_COLUMNS.DIVISION]);
    console.log("==========================================\n");

    return res.status(200).json({
      success: true,
      message: "Login Successful",

      user: {
        name: user[USER_COLUMNS.NAME],
        role: user[USER_COLUMNS.ROLE],
        division: user[USER_COLUMNS.DIVISION],
        userID: user[USER_COLUMNS.USER_ID],
        department:user[USER_COLUMNS.department],
      },
    });

  } catch (error) {
    console.error("\n❌ LOGIN ERROR");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.log("==========================================\n");

    return res.status(500).json({
      success: false,
      message: "Login failed",
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
