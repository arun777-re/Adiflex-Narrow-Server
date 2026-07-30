// ==========================================
// DASHBOARD KPI
// ==========================================

import { getFGInventory } from "../services/fgSheets.js";
import { getSalesOrders } from "../services/salesOrderSheet.js";
import { getUsers } from "../services/userSheet.js";
import {getProductionOrders} from '../services/productionSheet.js'
import { PRODUCTION_COLUMNS } from "../constants/processMap.js";
import { FG_COLUMNS } from "../constants/FGColumns.js";


 const getAllProductionOrder = async()=>{
  const woven  =await getProductionOrders('WOVEN');
  const crochet  =await getProductionOrders('CROCHET');
  const rows = [
    woven[0],
    ...( woven).slice(1),
    ...crochet.slice(1)

  ];
  return rows;
}

export const getDashboardKPI = async () => {
  const salesOrders = await getSalesOrders();

  const productionOrders = await getAllProductionOrder();
  const fg = await getFGInventory();

  const users = await getUsers();

  return {
    totalOrders: salesOrders.length - 1,

    runningProduction: productionOrders
      .slice(1)
      .filter((row) => row[PRODUCTION_COLUMNS.STATUS] !== "Completed").length,

    dispatchReady: 0,

    fgStock: fg
      .slice(1)
      .reduce((sum, row) => sum + Number(row[FG_COLUMNS.AVAILABLE_QTY] || 0), 0),

    revenue: 0,

    pendingOrders: 0,

    users: users.length - 1,

    growth: 0,
  };
};

// ==========================================
// PRODUCTION ANALYTICS
// ==========================================

export const getProductionAnalytics = async () => {
  const production = await getAllProductionOrder();

  const rows = production.slice(1);

  return {
    woven: rows.filter(
      (r) => String(r[PRODUCTION_COLUMNS.DIVISION]).toUpperCase() === "WOVEN"
    ).length,

    crochet: rows.filter(
      (r) => String(r[PRODUCTION_COLUMNS.DIVISION]).toUpperCase() === "CROCHET"
    ).length,

    totalProduction: rows.reduce(
      (sum, r) =>
        sum + Number(r[PRODUCTION_COLUMNS.PRODUCTION_QTY] || 0),
      0
    ),

    completedOrders: rows.filter(
      (r) =>
        r[PRODUCTION_COLUMNS.STATUS] === "Completed" ||
        r[PRODUCTION_COLUMNS.STATUS] === "Cycle Completed"
    ).length,

    runningOrders: rows.filter(
      (r) =>
        r[PRODUCTION_COLUMNS.STATUS] === "Running"
    ).length,

    pendingOrders: rows.filter(
      (r) =>
        r[PRODUCTION_COLUMNS.STATUS] === "Pending"
    ).length,
  };
};

// ==========================================
// TODAY SUMMARY
// ==========================================

export const getSummary = async () => {
  const sales = await getSalesOrders();
  const production = await getAllProductionOrder();

  const today = new Date().toLocaleDateString("en-GB");

  return {
    todayOrders: sales
      .slice(1)
      .filter(r => String(r[1] || "").includes(today)).length,

    todayProduction: production
      .slice(1)
      .filter(r =>
        String(
          r[PRODUCTION_COLUMNS.UPDATED_TIME] || ""
        ).includes(today)
      ).length,

    todayDispatch: 0,

    todayBilling: 0,
  };
};

// ==========================================
// RECENT ACTIVITIES
// ==========================================

export const getRecentActivities = async () => {
  const rows = (await getAllProductionOrder())
    .slice(1)
    .reverse()
    .slice(0, 10);

  return rows.map(row => ({
    soNo: row[PRODUCTION_COLUMNS.SO_NO],
    product: row[PRODUCTION_COLUMNS.PRODUCT],
    status: row[PRODUCTION_COLUMNS.STATUS],
    updatedBy: row[PRODUCTION_COLUMNS.UPDATED_BY],
    updatedTime: row[PRODUCTION_COLUMNS.UPDATED_TIME],
  }));
};

// ==========================================
// INVENTORY SUMMARY
// ==========================================

export const getInventorySummary = async () => {
  const fg = await getFGInventory();

  const rows = fg.slice(1);

  return {

    totalFG: rows.reduce(
      (sum, r) =>
        sum +
        Number(r[FG_COLUMNS.AVAILABLE_QTY] || 0),
      0
    ),

    lowStock: rows.filter(
      r => Number(r[FG_COLUMNS.AVAILABLE_QTY] || 0) < 100
    ).length,

    outOfStock: rows.filter(
      r => Number(r[FG_COLUMNS.AVAILABLE_QTY] || 0) === 0
    ).length,

    inventory: rows
      .sort(
        (a, b) =>
          Number(a[FG_COLUMNS.AVAILABLE_QTY]) -
          Number(b[FG_COLUMNS.AVAILABLE_QTY])
      )
      .slice(0, 5)
      .map(r => ({
        sku: r[FG_COLUMNS.SKU_CODE],
        product: r[FG_COLUMNS.PRODUCT],
        qty: Number(r[FG_COLUMNS.AVAILABLE_QTY]),
      })),
  };
};

// ==========================================
// RECENT SALES ORDERS
// ==========================================

export const getRecentOrders = async () => {

  const sales = await getSalesOrders();

  return sales
    .slice(1)
    .reverse()
    .slice(0, 10)
    .map(r => ({

      soNo: r[0],

      date: r[1],

      customer: r[2],

      product: r[3],

      qty: r[5],

      status: r[15],

    }));

};
