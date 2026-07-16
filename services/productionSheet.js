import sheets, { auth,updateCell } from "../config/db.js";
import { PROCESS_MAP } from "../constants/processMap.js";
import { columnToIndex } from "../helpers/index.js";

const spreadsheetId = process.env.GOOGLE_SHEET_ID;

const sheetName = "Production_Process";

// Read all Production Orders

export const getProductionOrders = async () => {
  const response = await sheets.spreadsheets.values.get({
    auth: await auth.getClient(),
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  return response.data.values || [];
};

export const completeProductionProcess = async ({
  soNo,
  product,
  process,
  productionQty,
  updatedBy,
}) => {
  const authClient = await auth.getClient();

  const rows = await getProductionOrders();

  const index = rows.findIndex((row) => row[0] === soNo && row[1] === product);

  if (index === -1) {
    throw new Error("Production Order Not Found");
  }

  const rowNumber = index + 1;

  const map = PROCESS_MAP[process];
  // Check Previous Process

  if (map.previous) {
    const previousColumn = PROCESS_MAP[map.previous].status;

    const previousStatus = rows[index][columnToIndex(previousColumn)];

    if (previousStatus !== "Completed") {
      throw new Error(`${map.previous} is not completed yet`);
    }
  }

  if (!map) {
    throw new Error("Invalid Process");
  }

  const now = new Date().toLocaleString();

  // Update Current Production Qty

  if (productionQty !== undefined) {
    await updateCell(`E${rowNumber}`, productionQty);
  }

  // Process Status

  await updateCell(`${map.status}${rowNumber}`, "Completed");

  // Process Time

  await updateCell(`${map.time}${rowNumber}`, now);

  // Updated By

  await updateCell(`Z${rowNumber}`, updatedBy);

  // Updated Time

  await updateCell(`AA${rowNumber}`, now);

  // Packing Completed

  if (process === "packing") {
    await updateCell(`T${rowNumber}`, "Ready To Dispatch");
  }
};
