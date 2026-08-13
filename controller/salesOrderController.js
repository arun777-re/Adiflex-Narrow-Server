import { addDirectDispatchOrder } from "../helpers/salesOrderHelpers.js";
import {
  getSalesOrders,
  appendMultipleSalesOrders,
  cancelSalesOrder,
  appendSalesOrderToProductionProcess,
  ALLOWED_DIVISIONS,
  updateOverallStatus,
} from "../services/salesOrderSheet.js";
import { sendNotification } from "../helpers/notificationHelper.js";
import { generateNextCycleId } from "../helpers/productionHelpers.js";

const processingRequests = new Set();

// create sales order
export const createSalesOrder = async (req, res) => {
  console.log("req", req.body);
  let requestKey;
  try {
    const {
      date,
      customer,
      ordertype,
      jobWork,
      orderReceivedBy,
      products,
      shippinglocation,
      freight,
      billinglocation,
      route,
      partyPO,
    } = req.body;

    // validations
    if (
      !date ||
      !customer ||
      !products ||
      !products.length ||
      !shippinglocation ||
      !billinglocation || !route 
    ) {
      return res.status(400).json({
        success: false,

        message: "Date, Customer,Products, route and Location are required",
      });
    }
    // deduplications

    requestKey = JSON.stringify({
      date,
      customer,
      shippinglocation,
      products,
    });

    if (processingRequests.has(requestKey)) {
      return res.status(409).json({
        success: false,
        message: "Sales Order is already being processed",
      });
    }

    processingRequests.add(requestKey);

    const normalizedDivision = products.map((item) => {
      return String(item.division).trim().toLowerCase();
    });

    const hasInvalidDivision = products.some(
      (item) =>
        !ALLOWED_DIVISIONS.includes(String(item.division).trim().toLowerCase()),
    );
    if (hasInvalidDivision) {
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
      const productionQty = Math.max(
        Number(item.qty) - Number(item.openingFgQty),
        0,
      );
      const status =
        Number(item.openingFgQty) >= Number(item.qty)
          ? "Ready To Dispatch"
          : "Pending Production";
      values.push([
        soNo,
        date,
        item.skucode,
        customer,
        item.product,
        ordertype,
        item.division,
        item.qty,
        item.rate,
        item.rateadjustment,
        item.finalrate,
        item.unit,
        item.openingFgQty,
        productionQty,
        jobWork,
        freight,
        0,
        0,
        orderReceivedBy,
        status,
        billinglocation,
        shippinglocation,
        Number(item.finalrate) * Number(item.qty),
      ]);
    });

    // values for production state
    const productionValues = [];
    await appendMultipleSalesOrders(values);

    for (let item of products) {
      const soQty = Number(item.qty);
      const openingFG = Number(item.openingFgQty);
      const productionQty = Math.max(soQty - openingFG, 0);
      //  Enough FG available
      if (openingFG >= soQty) {
        await addDirectDispatchOrder({
          soNo,
          sku: item.skucode,
          product: item.product,
          rate: item.finalrate,
          division: item.division,
          qty: soQty,
          route,
          customer,
          partyPO,
          shippinglocation: shippinglocation,
          billinglocation: billinglocation,
          updatedBy: orderReceivedBy,
        });
        // we are sending notification to dispatch manager when sales order is created and enough FG is available for dispatch
        await sendNotification({
          role: "dispatch",
          division: item.division,
          type: "sales-order",
          title: "New Sales Order Ready for Dispatch",
          message: `A new sales order:${soNo} is ready for dispatch`,
          reference: soNo,
        });
      } else {
        const cycleID = generateNextCycleId(soNo,item.skucode);
        productionValues.push([
          soNo,
          cycleID,
          item.skucode,
          item.product,
          ordertype,
          productionQty,
          item.division,
          "",
          jobWork,
        ]);
      }
    }
    if (productionValues.length > 0) {
      await appendSalesOrderToProductionProcess(
        productionValues,
        normalizedDivision,
      );
      const divisions = [...new Set(normalizedDivision)];
      for (const division of divisions) {
        await sendNotification({
          role: "productionSupervisor",
          division: division,
          type: "sales-order",
          title: "New Sales Order Created",
          message: `A new sales order has been created for ${soNo}`,
          reference: soNo,
        });
      }
    }

    return res.status(201).json({
      success: true,

      message: "Sales Order Created",

      soNo,
    });
  } catch (error) {
    console.log("error in req:", error);
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  } finally {
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
      rateadjustment: Number(row[9]) || 0,
      finalrate: Number(row[10]) || 0,
      unit: row[11] || "",

      openingFgQty: Number(row[12]) || 0,

      productionQty: Number(row[13]) || 0,

      jobWork: row[14] === true || row[14] === "TRUE",
      manufacturedQty: Number(row[15]) || 0,

      dispatchedQty: Number(row[16]) || 0,

      orderReceivedBy: row[17] || "",

      status: row[18] || "",
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
