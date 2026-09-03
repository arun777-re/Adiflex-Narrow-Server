import { SALES_COLUMNS } from "../constants/salesColumns.js";
import { getSalesOrders } from "./salesOrderSheet.js";

import {
  normalizeDivision,
  isCompletedStatus,
  isDateInPeriod,
  parseNumber,
} from "../utils/analytics.utils.js";

const getAnalyticsRows = async ({
  period = "month",
  division = "ALL",
}) => {
  const rows = await getSalesOrders();

  console.log("\n========================================");
  console.log("🔥 ANALYTICS DEBUG START");
  console.log("========================================");

  console.log("📦 rows type:", typeof rows);
  console.log("📦 isArray:", Array.isArray(rows));
  console.log("📦 total rows:", rows?.length);

  console.log(
    "📋 FIRST ROW:",
    JSON.stringify(rows?.[0], null, 2)
  );

  console.log(
    "📋 SECOND ROW:",
    JSON.stringify(rows?.[1], null, 2)
  );

  console.log("🔎 period:", period);
  console.log("🔎 division:", division);

  if (!Array.isArray(rows)) {
    console.log("❌ rows is NOT an array");
    return [];
  }

  const normalizedDivision = normalizeDivision(division);

  console.log(
    "🔎 normalizedDivision:",
    normalizedDivision
  );

  const dataRows = rows.slice(1);

  console.log(
    "📊 rows after slice(1):",
    dataRows.length
  );

  const filteredRows = dataRows.filter((row, index) => {
    console.log("\n----------------------------------------");
    console.log(`🔹 CHECKING ROW ${index + 1}`);
    console.log("----------------------------------------");

    console.log(
      "FULL ROW:",
      JSON.stringify(row, null, 2)
    );

    if (!row || !row.length) {
      console.log("❌ REJECTED → empty row");
      return false;
    }

    // ==============================
    // SO NUMBER
    // ==============================

    const soNo = String(
      row[SALES_COLUMNS.SO_NO] || ""
    ).trim();

    console.log("🧾 SO NO:", soNo);

    if (!soNo) {
      console.log("❌ REJECTED → SO NO missing");
      return false;
    }

    // ==============================
    // DATE
    // ==============================

    const rawDate = row[SALES_COLUMNS.DATE];

    console.log("📅 RAW DATE:", rawDate);

    const dateResult = isDateInPeriod(
      rawDate,
      period
    );

    console.log(
      "📅 DATE MATCH:",
      dateResult
    );

    if (!dateResult) {
      console.log(
        "❌ REJECTED → DATE FILTER"
      );

      return false;
    }

    // ==============================
    // DIVISION
    // ==============================

    const rowDivision = String(
      row[SALES_COLUMNS.DIVISION] || ""
    )
      .trim()
      .toUpperCase();

    console.log(
      "🏭 ROW DIVISION:",
      rowDivision
    );

    console.log(
      "🏭 REQUIRED DIVISION:",
      normalizedDivision
    );

    if (normalizedDivision !== "ALL") {
      if (
        rowDivision !== normalizedDivision
      ) {
        console.log(
          "❌ REJECTED → DIVISION FILTER"
        );

        return false;
      }
    }

    // ==============================
    // ACCEPTED
    // ==============================

    console.log(
      "✅✅ ROW ACCEPTED"
    );

    return true;
  });

  console.log("\n========================================");
  console.log(
    "🔥 FINAL ANALYTICS ROWS:",
    filteredRows.length
  );
  console.log("========================================\n");

  return filteredRows;
};


export const getAnalyticsSummary = async ({
  period = "month",
  division = "ALL",
}) => {
  const rows = await getAnalyticsRows({
    period,
    division,
  });
  let ordersReceived = 0;
  let ordersCompleted = 0;
  let pendingOrders = 0;
  let sales = 0;

  for (const row of rows) {
    ordersReceived++;

    const status = row[SALES_COLUMNS.OVERALL_STATUS];

    if (isCompletedStatus(status)) {
      ordersCompleted++;
    } else {
      pendingOrders++;
    }

    sales += parseNumber(
      row[SALES_COLUMNS.ORDER_AMOUNT]
    );
  }
console.log("🔥 Analytics Summary:", {sales,ordersReceived,ordersCompleted,pendingOrders})
  return {
    ordersReceived,
    ordersCompleted,
    pendingOrders,
    sales,

    // Abhi previous period calculate nahi kar rahe.
    // Next step mein exact previous week/month/year
    // comparison add karenge.
    previousOrdersReceived: 0,
    previousOrdersCompleted: 0,
    previousPendingOrders: 0,
    previousSales: 0,
  };
};


export const getOrdersAnalytics = async ({
  period = "month",
  division = "ALL",
}) => {
  const rows = await getAnalyticsRows({
    period,
    division,
  });

  const divisionMap = {};

  for (const row of rows) {
    const rowDivision =
      String(
        row[SALES_COLUMNS.DIVISION] || "UNKNOWN"
      ).trim() || "UNKNOWN";

    if (!divisionMap[rowDivision]) {
      divisionMap[rowDivision] = {
        division: rowDivision,
        orders: 0,
        completed: 0,
      };
    }

    divisionMap[rowDivision].orders++;

    if (
      isCompletedStatus(
        row[SALES_COLUMNS.OVERALL_STATUS]
      )
    ) {
      divisionMap[rowDivision].completed++;
    }
  }

  return {
    weekly: [],
    division: Object.values(divisionMap),
  };
}; 

export const getSalesAnalytics = async ({
  period = "month",
  division = "ALL",
}) => {
  const rows = await getAnalyticsRows({
    period,
    division,
  });

  const divisionMap = {};

  for (const row of rows) {
    const rowDivision =
      String(
        row[SALES_COLUMNS.DIVISION] || "UNKNOWN"
      ).trim() || "UNKNOWN";

    const orderAmount = parseNumber(
      row[SALES_COLUMNS.ORDER_AMOUNT]
    );

    if (!divisionMap[rowDivision]) {
      divisionMap[rowDivision] = {
        division: rowDivision,
        sales: 0,
      };
    }

    divisionMap[rowDivision].sales += orderAmount;
  }

  return {
    weekly: [],
    division: Object.values(divisionMap),
  };
};