import { sendResponse } from "../helpers/sql/global.helper.js";
import jwt from "jsonwebtoken";

// admin authorization
export const requireAdmin = (req, res,next) => {
    console.log("ADMIN MIDDLEWARE HIT", req.user);
  if (String(req.user?.role).trim().toLowerCase() !== "admin" &&
   String(req.user?.role).trim().toLowerCase() !== "system_admin") {
    return sendResponse({
      res,
      statusCode: 403,
      success: false,
      message: "Only admin can manage users",
    });
  }
  next();
};

export const authMiddleware = (req, res, next) => {
  console.log("1. AUTH MIDDLEWARE HIT");

  try {
    const authHeader = req.headers.authorization;

    console.log("AUTH HEADER EXISTS:", Boolean(authHeader));
    console.log("AUTH HEADER PREFIX:", authHeader?.slice(0, 7));

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("TOKEN MISSING");

      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("2. DECODED TOKEN:", decoded);

    req.user = decoded;

    console.log("3. AUTH SUCCESS");

    next();

  } catch (error) {
    console.error("AUTH ERROR:", error.name, error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
