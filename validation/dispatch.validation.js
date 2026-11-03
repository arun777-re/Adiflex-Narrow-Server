import { sendResponse } from "../helpers/sql/global.helper.js";
export const basicDispatchValidation = ({items,res,cleanDriverName,cleanVehicleNo,parsedGstRate}) => {
  if (!items) {
    throw new Error("Delivery challan items are missing");
  }

  // 1. Basic validation
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    !cleanVehicleNo ||
    !cleanDriverName ||
    !Number.isFinite(parsedGstRate) ||
    parsedGstRate < 0 ||
    parsedGstRate > 100
  ) {
    return sendResponse({
        res,
      statusCode: 400,
      message:
        "Valid items, vehicle number, driver name and GST rate are required",
    });
  }
};
