import { getUsers } from "../services/googleSheets.js";


export const login = async (req, res) => {

  try {

    const {
      role,
      division,
      password,
    } = req.body;


    // ==========================================
    // VALIDATION
    // ==========================================

    if (
      !role ||
      !division ||
      !password
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Role, Division and Password are required",

      });

    }


    // ==========================================
    // GET USERS
    // ==========================================

    const users =
      await getUsers();


    // Remove header row

    const rows =
      users.slice(1);


    // ==========================================
    // FIND USER
    // ==========================================

    const user =
      rows.find((row) => {


        const userRole =
          String(
            row[1] || ""
          )
            .trim()
            .toLowerCase();


        const userDivision =
          String(
            row[2] || ""
          )
            .trim()
            .toLowerCase();


        const userPassword =
          String(
            row[3] || ""
          )
            .trim();


        const userStatus =
          String(
            row[5] || ""
          )
            .trim()
            .toLowerCase();


        return (

          userRole ===
          role
            .trim()
            .toLowerCase()


          &&


          userDivision ===
          division
            .trim()
            .toLowerCase()


          &&


          userPassword ===
          password
            .trim()


          &&


          (
            !userStatus ||
            userStatus ===
            "active"
          )

        );

      });


    // ==========================================
    // INVALID LOGIN
    // ==========================================

    if (!user) {

      return res.status(401).json({

        success: false,

        message:
          "Invalid Role, Division or Password",

      });

    }


    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(200).json({

      success: true,

      message:
        "Login Successful",

      user: {

        name:
          user[0],

        role:
          user[1],

        division:
          user[2],

      },

    });


  } catch (error) {

    return res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};