import {

  getAllDispatchOrders,

  dispatchOrder,

} from "../services/dispatchSheet.js";


// =====================================================
// GET ALL DISPATCH
// =====================================================

export const getDispatchOrders = async (

  req,

  res

) => {

  try {

    const dispatchOrders =
      await getAllDispatchOrders();


    return res.status(200).json({

      success:
        true,

      dispatchOrders,

    });

  }

  catch (error) {

    console.error(
      "Get Dispatch Error:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message,

    });

  }

};



// =====================================================
// DISPATCH ORDER
// =====================================================

export const createDispatch = async (

  req,

  res

) => {

  try {

    const {

      soNo,

      product,

      dispatchQty,

    } =
      req.body;


    const result =
      await dispatchOrder({

        soNo,

        product,

        dispatchQty,

      });


    return res.status(200).json({

      success:
        true,

      message:
        "Dispatch successful",

      dispatch:
        result,

    });

  }

  catch (error) {

    console.error(

      "Dispatch Order Error:",

      error

    );


    return res.status(400).json({

      success:
        false,

      message:
        error.message,

    });

  }

};