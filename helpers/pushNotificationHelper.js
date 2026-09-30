
import sheets from "../config/db.js";

import {
  USER_COLUMNS,
  SUBSCRIPTION_COLUMNS,
} from "../constants/userColumns.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";


// =====================================================
// GET PUSH SUBSCRIPTIONS
// =====================================================

export const getPushSubscriptions = async () => {
  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId:
        process.env.GOOGLE_SHEET_ID,

      range:
        `${SHEET_NAMES.PUSH_SHEET}!A:M`,
    });

  return response.data.values || [];
};





// =====================================================
// FIND USER
// =====================================================

export const findUserById = async (userId) => {
  const rows = await getUsers();

  const rowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      String(
        row[USER_COLUMNS.USER_ID] || ""
      ).trim() === String(userId).trim()
  );

  if (rowIndex === -1) {
    return null;
  }

  return {
    row: rows[rowIndex],
    rowIndex,
    userId:
      rows[rowIndex][USER_COLUMNS.USER_ID],

    name:
      rows[rowIndex][USER_COLUMNS.NAME],

    role:
      rows[rowIndex][USER_COLUMNS.ROLE],

    division:
      rows[rowIndex][USER_COLUMNS.DIVISION],

    status:
      rows[rowIndex][USER_COLUMNS.STATUS],
  };
};


// =====================================================
// FIND SUBSCRIPTION BY ENDPOINT
// =====================================================

export const findSubscriptionByEndpoint = async (
  endpoint
) => {
  const rows = await getPushSubscriptions();

  const rowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      String(
        row[
          SUBSCRIPTION_COLUMNS.ENDPOINT
        ] || ""
      ).trim() === String(endpoint).trim()
  );

  if (rowIndex === -1) {
    return null;
  }

  return {
    row: rows[rowIndex],
    rowIndex,
  };
};


// =====================================================
// GET SUBSCRIPTIONS FOR USER
// =====================================================

export const getUserPushSubscriptions = async (userId) => {
  const rows = await getPushSubscriptions();

  const normalizedUserId = String(userId || "").trim();

  return rows.slice(1).filter((row) => {
    const rowUserId = String(
      row[SUBSCRIPTION_COLUMNS.USER_ID] || ""
    ).trim();

    const status = String(
      row[SUBSCRIPTION_COLUMNS.STATUS] || ""
    ).trim().toUpperCase();

    const endpoint = String(
      row[SUBSCRIPTION_COLUMNS.ENDPOINT] || ""
    ).trim();

    const p256dh = String(
      row[SUBSCRIPTION_COLUMNS.P256DH] || ""
    ).trim();

    const auth = String(
      row[SUBSCRIPTION_COLUMNS.AUTH] || ""
    ).trim();

    return (
      rowUserId === normalizedUserId &&
      status === "ACTIVE" &&
      endpoint &&
      p256dh &&
      auth
    );
  });
};


// =====================================================
// GET SUBSCRIPTIONS FOR ROLE + DIVISION
// =====================================================

export const getSubscriptionsForNotification =
  async ({
    role,
    division,
  }) => {

    const rows =
      await getPushSubscriptions();

    const normalizedRole =
      String(role || "")
        .trim()
        .toLowerCase();

    const normalizedDivision =
      String(division || "")
        .trim()
        .toLowerCase();

    return rows
      .slice(1)
      .filter((row) => {

        const rowRole =
          String(
            row[
              SUBSCRIPTION_COLUMNS.ROLE
            ] || ""
          )
            .trim()
            .toLowerCase();

        const rowDivision =
          String(
            row[
              SUBSCRIPTION_COLUMNS.DIVISION
            ] || ""
          )
            .trim()
            .toLowerCase();

        const status =
          String(
            row[
              SUBSCRIPTION_COLUMNS.STATUS
            ] || ""
          )
            .trim()
            .toUpperCase();

        if (status !== "ACTIVE") {
          return false;
        }

        if (rowRole !== normalizedRole) {
          return false;
        }

        // all division
        if (rowDivision === "all") {
          return true;
        }

        return (
          rowDivision ===
          normalizedDivision
        );
      });
  };