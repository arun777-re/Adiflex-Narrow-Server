import {
  getSalesOrders,
  appendMultipleSalesOrders,
  cancelSalesOrder,
  appendSalesOrderToProductionProcess,
  ALLOWED_DIVISIONS,
} from "../services/salesOrderSheet.js";

// create sales order
export const createSalesOrder = async (req, res) => {
  try {
    const {
      date,
      customer,
      division,
      jobWork,
      orderReceivedBy,
      products,
      location
    } = req.body;


    // validations
     if (
      !date ||
      !customer ||
      !division ||
      !products ||
      !products.length ||
      !location
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Date, Customer, Division, Products and Location are required",

      });

    }


    const normalizedDivision =
      String(division)
        .trim()
        .toLowerCase();


    if (
      !ALLOWED_DIVISIONS.includes(
        normalizedDivision
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid Division",

      });

    }



    const rows = await getSalesOrders();

    let soNo = "ANF00001";

    if (rows.length > 1) {
      const lastSo = rows[rows.length - 1][0];

      const number = parseInt(lastSo.replace("ANF", ""));

      soNo = `ANF${String(number + 1).padStart(5, "0")}`;
    }

    const values = [];

    products.forEach((item) => {
      const productionQty = Number(item.qty) - Number(item.openingFgQty);
      values.push([
        soNo,
        date,
        customer,
        item.product,
        division,
        item.qty,
        item.rate,
        item.unit,
        item.openingFgQty,
        productionQty,
        jobWork,
        0,
        0,
        orderReceivedBy,
        "Pending",
        location
      ]);
    });

    // values for production state 
    const productionValues = [];
    products.forEach((item) => {
       const productionQty = Number(item.qty) - Number(item.openingFgQty);
      productionValues.push([
         soNo,
         item.product,
         productionQty,
         division,
         "",
         jobWork

      ]);
    });
    await appendMultipleSalesOrders(values);
    await appendSalesOrderToProductionProcess(productionValues,division);
    return res.status(201).json({
      success: true,

      message: "Sales Order Created",

      soNo,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// get all sales orders
export const getAllSalesOrders = async (req, res) => {
  try {
    const rows = await getSalesOrders();

    // Header remove
    const data = rows.slice(1);
   const orders = data.map((row) => ({
  soNo: row[0] || "",
  date: row[1] || "",
  customer: row[2] || "",
  product: row[3] || "",

  division: row[4] || "",

  qty: Number(row[5]) || 0,

  rate: Number(row[6]) || 0,

  unit: row[7] || "",

  openingFgQty: Number(row[8]) || 0,

  productionQty: Number(row[9]) || 0,

  jobWork: row[10] === true || row[10] === "TRUE",
  manufacturedQty: Number(row[11]) || 0,

  dispatchedQty: Number(row[12]) || 0,

  orderReceivedBy: row[13] || "",

  status: row[14] || "",
}));

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


//  cancel sales order only status will be changed to cancelled and no data will be deleted from the sheet
export const cancelSalesOrders = async (req, res) => {
  try {
    const { soNo } = req.params;

    console.log("soNo to delete:", soNo);

    await cancelSalesOrder(soNo);

    return res.status(200).json({
      success: true,
      message: "Sales Order Cancelled Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

  
