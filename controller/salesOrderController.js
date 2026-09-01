import {
  addDirectDispatchOrder,
  convertToMeter,
  generateNextSoNo,
  getFGCached,
  getProductMasterCached,
} from "../helpers/salesOrderHelpers.js";
import {
  getSalesOrders,
  appendMultipleSalesOrders,
  cancelSalesOrder,
  appendSalesOrderToProductionProcess,
  ALLOWED_DIVISIONS,
  updateOverallStatus,
  getLastSalesOrderNumber,
} from "../services/salesOrderSheet.js";
import { sendNotification } from "../helpers/notificationHelper.js";
import { generateNextCycleId } from "../helpers/productionHelpers.js";
import { consumeFGStockService, findFGStockBySKU } from "../services/fgSheets.js";
import { getProductBySkuService } from "../services/productSheet.js";
import { SALES_COLUMNS } from "../constants/salesColumns.js";

const processingRequests = new Set();

// =====================================================
// CREATE SALES ORDER
// =====================================================
export const createSalesOrder = async (req, res) => {
  console.log("req", req.body);
  console.time("🔥 TOTAL createSalesOrder");

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

    // =====================================================
    // VALIDATIONS
    // =====================================================

    if (
      !date ||
      !customer ||
      !products?.length ||
      !shippinglocation ||
      !billinglocation ||
      !route
    ) {
      return res.status(400).json({
        success: false,
        message: "Date, Customer, Products, Route and Location are required",
      });
    }

    const normalizedOrderType = String(ordertype).trim().toUpperCase();

    if (!["CUSTOMER", "INTERNAL"].includes(normalizedOrderType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order Type",
      });
    }

    // =====================================================
    // REQUEST DEDUPLICATION
    // =====================================================

    requestKey = JSON.stringify({
      date,
      customer,
      ordertype: normalizedOrderType,
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

    // =====================================================
    // VALIDATE + NORMALIZE DIVISIONS
    // =====================================================

    const normalizedDivision = products.map((item) =>
      String(item.division).trim().toLowerCase(),
    );

    const hasInvalidDivision = normalizedDivision.some(
      (division) => !ALLOWED_DIVISIONS.includes(division),
    );

    if (hasInvalidDivision) {
      return res.status(400).json({
        success: false,
        message: "Invalid Division",
      });
    }

    // =====================================================
    // GENERATE SO NUMBER
    // =====================================================
    console.time("⏱️ getSalesOrders");
    const soNo = await generateNextSoNo();

console.log("🔥 GENERATED SO:", soNo);
    console.timeEnd("⏱️ getSalesOrders");

    // =====================================================
    // PROCESS PRODUCTS
    // =====================================================

    const values = [];
    const productionValues = [];
    const dispatchOrders = [];

    // =====================================================
    // FG LOOKUP
    // INTERNAL = NO FG CHECK
    // CUSTOMER = FG CHECK
    // =====================================================

    const processedProducts = await Promise.all(
      products.map(async (item) => {
        const soQty = Number(item.qty) || 0;
        const [productMaster, fgStock] = await Promise.all([
          getProductMasterCached(item.skucode),
          getFGCached(item.skucode),
        ]);

        if (soQty <= 0) {
          throw new Error(`Invalid quantity for SKU: ${item.skucode}`);
        }

        // -------------------------------------------------
        // INTERNAL ORDER(here unit must be always in meter)
        // -------------------------------------------------

        if (normalizedOrderType === "INTERNAL") {
          return {
            item,
            soQty,
            openingFG: 0,
            dispatchQty: 0,
            productionQty: soQty,
            status: "Pending Production",
          };
        }

        // -------------------------------------------------
        // CUSTOMER ORDER
        // -------------------------------------------------
        console.log("productsss", productMaster);

        const soMeterQty = convertToMeter({
          qty: soQty,
          unit: item.unit,
          basicUnit: productMaster.basicUnit,
          meterPerRoll: productMaster.meterPerRoll,
          meterPerKg: productMaster.meterPerKg,
        });

        console.log("soMeterQty.......", soMeterQty);

        const openingFG = Number(fgStock?.availableQty) || 0;

        const dispatchQty = Math.min(openingFG, soMeterQty);

        const productionQty = Math.max(soMeterQty - openingFG, 0);

        const status =
          productionQty === 0 ? "Ready To Dispatch" : "Pending Production";

        console.log(
          `SKU: ${item.skucode} | SO: ${soQty} | FG: ${openingFG} | Dispatch: ${dispatchQty} | Production: ${productionQty}`,
        );

        return {
          item,
          soQty,
          soMeterQty,
          openingFG,
          dispatchQty,
          productionQty,
          status,
          fgStock
        };
      }),
    );

    // =====================================================
    // BUILD SALES ORDER + DISPATCH + PRODUCTION
    // =====================================================

    for (const {
      item,
      soQty,
      openingFG,
      dispatchQty,
      productionQty,
      status,
      fgStock,
      soMeterQty
    } of processedProducts) {
      // ===================================================
      // SALES ORDER ROW
      // ===================================================

      values.push([
        soNo,
        date,
        item.skucode,
        customer,
        item.product,
        normalizedOrderType,
        route,
        partyPO,
        item.division,
        soQty,
        item.unit,
        soMeterQty,
        item.rate,
        item.rateadjustment,
        item.finalrate,

        // AVAILABLE FG AT SO CREATION
        openingFG,

        // PRODUCTION REQUIRED
        productionQty,

        jobWork,
        freight,
        0,
        0,
        orderReceivedBy,
        status,
        billinglocation,
        shippinglocation,

        Number(item.finalrate) * soMeterQty,
      ]);

      // ===================================================
      // CUSTOMER → FG AVAILABLE → DISPATCH
      // ===================================================

      if (normalizedOrderType === "CUSTOMER" && dispatchQty > 0) {
        console.log("HIII i am in dispatch portion");
        dispatchOrders.push({
          soNo,
          sku: item.skucode,
          cycleID: "",
          product: item.product,
          customer,
          driverName: "",
          vehicleNo: "",
          partyPO,
          route,
          division: item.division,
          productionQty: 0,
          rate: item.finalrate,
          shippinglocation,
          billinglocation,
          freight,
          qty: dispatchQty,
          status: "Ready To Dispatch",
          billing: "",
          fgStock
        });
      }

      // ===================================================
      // PRODUCTION REQUIRED
      // ===================================================

      if (productionQty > 0) {
        const cycleID = generateNextCycleId(soNo, item.skucode);
        console.log("HIII i am in production portion");
        productionValues.push([
          soNo,
          cycleID,
          item.skucode,
          item.product,
          customer,
          normalizedOrderType,
          productionQty,
          item.division,
          "",
          jobWork,
        ]);
      }
    }

    // =====================================================
    // WRITE SALES ORDERS
    // =====================================================

    await appendMultipleSalesOrders(values);

    // =====================================================
    // WRITE DIRECT DISPATCH ORDERS
    // =====================================================

    if (dispatchOrders.length > 0) {
      await Promise.all(
        dispatchOrders.map((order) =>[
           consumeFGStockService({
            sku:order.sku,
            qty:order.qty,
            updatedBy:orderReceivedBy,
            fgStock:order.fgStock
          }),
          addDirectDispatchOrder(order)]),
      );

      // ---------------------------------------------------
      // DISPATCH NOTIFICATIONS
      // ---------------------------------------------------

      const dispatchDivisions = [
        ...new Set(
          dispatchOrders.map((order) =>
            String(order.division).trim().toLowerCase(),
          ),
        ),
      ];

      await Promise.all(
        dispatchDivisions.map((division) =>
          sendNotification({
            role: "dispatch",
            division,
            type: "sales-order",
            title: "New Sales Order Ready for Dispatch",
            message: `A new sales order ${soNo} is ready for dispatch`,
            reference: soNo,
          }),
        ),
      );
    }

    // =====================================================
    // WRITE PRODUCTION ORDERS
    // =====================================================

    if (productionValues.length > 0) {
      await appendSalesOrderToProductionProcess(
        productionValues,
        normalizedDivision,
      );

      // ---------------------------------------------------
      // PRODUCTION NOTIFICATIONS
      // ---------------------------------------------------

      const productionDivisions = [...new Set(normalizedDivision)];

      await Promise.all(
        productionDivisions.map((division) =>
          sendNotification({
            role: "productionSupervisor",
            division,
            type: "sales-order",
            title: "New Sales Order Created",
            message: `A new sales order has been created for ${soNo}`,
            reference: soNo,
          }),
        ),
      );
    }

    // =====================================================
    // SUCCESS
    // =====================================================
    console.timeEnd("🔥 TOTAL createSalesOrder");
    return res.status(201).json({
      success: true,
      message: "Sales Order Created",
      soNo,
    });
  } catch (error) {
    console.log("Error in createSalesOrder:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (requestKey) {
      processingRequests.delete(requestKey);
    }
  }
};

// get all sales orders
export const getAllSalesOrders = async (req, res) => {
  const toBoolean = (value) => {
  return String(value).trim().toUpperCase() === "TRUE";
};
  try {
    const rows = await getSalesOrders();
    // Header remove
    const data = rows.slice(1);
    const validRows = data.filter((row)=> String(row[SALES_COLUMNS.SO_NO] || "").trim() !== "");

    const orders = validRows.map((row) => { 
      const dispatchStatus = Number(row[SALES_COLUMNS.SO_QTY] || 0) - Number(row[SALES_COLUMNS.DISPATCHED_QTY] || 0);
      const productionStatus = Number(row[SALES_COLUMNS.PRODUCTION_QTY] || 0) - Number(row[SALES_COLUMNS.MANUFACTURED_QTY] || 0);
      return{

      soNo: row[SALES_COLUMNS.SO_NO] || "",
      date: row[SALES_COLUMNS.DATE] || "",
      skucode: row[SALES_COLUMNS.SKU_CODE] || "",
      customer: row[SALES_COLUMNS.CUSTOMER] || "",
      product: row[SALES_COLUMNS.PRODUCT] || "",
      ordertype: row[SALES_COLUMNS.ORDER_TYPE] || "",

      division: row[SALES_COLUMNS.DIVISION] || "",

      qty: Number(row[SALES_COLUMNS.SO_QTY]) || 0,
      qtyInMeter:Number(row[SALES_COLUMNS.SO_QTY_IN_METER] ) || 0,
      rate: Number(row[SALES_COLUMNS.STANDARD_RATE]) || 0,
      rateadjustment: Number(row[SALES_COLUMNS.RATE_ADJUSTMENT]) || 0,
      finalrate: Number(row[SALES_COLUMNS.FINAL_RATE]) || 0,
      unit: row[SALES_COLUMNS.UNIT] || "",

      openingFgQty: Number(row[SALES_COLUMNS.OPENING_FG_QTY]) || 0,

      productionQty: Number(row[SALES_COLUMNS.PRODUCTION_QTY]) || 0,

      jobWork: toBoolean(row[SALES_COLUMNS.JOB_WORK]) ,
      manufacturedQty: Number(row[SALES_COLUMNS.MANUFACTURED_QTY]) || 0,

      dispatchedQty: Number(row[SALES_COLUMNS.DISPATCHED_QTY]) || 0,

      orderReceivedBy: row[SALES_COLUMNS.ORDER_RECEIVED_BY] || "",
       
      dispatchstatus: dispatchStatus > 0 ? "Pending Dispatch" : "Dispatched",
      productionstatus: productionStatus > 0 ? "Pending Production" : "Completed",
      orderAmount:row[SALES_COLUMNS.ORDER_AMOUNT] || 0,
      }

    });

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
