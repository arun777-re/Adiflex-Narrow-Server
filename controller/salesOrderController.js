import {
  getSalesOrders,
  appendMultipleSalesOrders,
  cancelSalesOrder,
  appendSalesOrderToProductionProcess,
  ALLOWED_DIVISIONS,
} from "../services/salesOrderSheet.js";

const processingRequests = new Set();

// create sales order
export const createSalesOrder = async (req, res) => {
  try {
    const {
      date,
      customer,
      division,
      ordertype,
      jobWork,
      orderReceivedBy,
      products,
      location,
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

        message: "Date, Customer, Division, Products and Location are required",
      });
    }
    // deduplications

    const requestKey = JSON.stringify({
      date,
      customer,
      division,
      location,
      products,
    });

    if (processingRequests.has(requestKey)) {
      return res.status(409).json({
        success: false,
        message: "Sales Order is already being processed",
      });
    }

    processingRequests.add(requestKey);

    const normalizedDivision = String(division).trim().toLowerCase();

    if (!ALLOWED_DIVISIONS.includes(normalizedDivision)) {
      return res.status(400).json({
        success: false,

        message: "Invalid Division",
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
        item.skucode,
        customer,
        item.product,
        ordertype,
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
        location,
      ]);
    });

    // values for production state
    const productionValues = [];
    products.forEach((item) => {
      const productionQty = Number(item.qty) - Number(item.openingFgQty);
      productionValues.push([
        soNo,
        item.skucode,
        item.product,
        ordertype,
        productionQty,
        division,
        "",
        jobWork,
      ]);
    });
    await appendMultipleSalesOrders(values);
    await appendSalesOrderToProductionProcess(
      productionValues,
      normalizedDivision,
    );
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
  }finally{
     processingRequests.delete(requestKey);
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
      skucode: row[2] || "",
      customer: row[3] || "",
      product: row[4] || "",
      ordertype: row[5] || "",

      division: row[6] || "",

      qty: Number(row[7]) || 0,

      rate: Number(row[8]) || 0,

      unit: row[9] || "",

      openingFgQty: Number(row[10]) || 0,

      productionQty: Number(row[11]) || 0,

      jobWork: row[12] === true || row[12] === "TRUE",
      manufacturedQty: Number(row[13]) || 0,

      dispatchedQty: Number(row[14]) || 0,

      orderReceivedBy: row[15] || "",

      status: row[16] || "",
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
