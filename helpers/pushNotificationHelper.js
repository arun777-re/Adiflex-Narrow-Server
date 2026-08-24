
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
// GET USERS
// =====================================================

export const getUsers = async () => {

  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId:
        process.env.GOOGLE_SHEET_ID,

      range:
        `${SHEET_NAMES.USERS}!A:F`,
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

export const getUserPushSubscriptions = async (
  userId
) => {
  const rows = await getPushSubscriptions();

  return rows
    .slice(1)
    .filter(
      (row) =>
        String(
          row[
            SUBSCRIPTION_COLUMNS.USER_ID
          ] || ""
        ).trim() === String(userId).trim()
    );
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