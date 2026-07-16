import { getUsers } from "../services/googleSheets.js";

export const login = async (req, res) => {
  try {
    const {role, password } = req.body;

    const users = await getUsers();

    // header remove
    const rows = users.slice(1);
   const user = rows.find((row) => {
  return (
    row[2]?.trim().toLowerCase() === role.trim().toLowerCase() &&
    row[3]?.trim() === password.trim() &&
    (!row[5] || row[5].trim().toLowerCase() === "active")
  );
});
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Role or Password",
      });
    }

 return res.status(200).json({
      success: true,
      message: "Login Successful",
      user: {
        id: user[0],
        name: user[1],
        role: user[2],
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};