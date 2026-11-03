import {
  PRODUCTION_STAGES,
  PARTIAL_RELEASE_STAGES,
  ASSIGNED_STAGES_TO_ROLE,
  
} from "../constants/production.constant.js";

export const normalizeStageCode = (value) =>
  String(value || "").trim().toUpperCase();

export const getCompleteProductionValidationError = (payload, user) => {
  const {
    productionId,
    cycleID,
    process,
    releaseQty,
    wastageQty,
    actualQtyAtPacking,
  } = payload;

  if (!user) {
    return { statusCode: 401, message: "Authentication required" };
  }

  const stageCode = normalizeStageCode(process);
  const userRole = String(
    user.role || user.roleName || user.role_name || "",
  ).toLowerCase();

  const isAdmin = userRole === "admin";
  let assignedStages = null;

  if (userRole === "productionsupervisor") {
    assignedStages = ASSIGNED_STAGES_TO_ROLE.productionsupervisor;
  } else if (userRole === "qualitysupervisor") {
    assignedStages = ASSIGNED_STAGES_TO_ROLE.qualitysupervisor;
  } else if (userRole === "packingsupervisor") {
    assignedStages = ASSIGNED_STAGES_TO_ROLE.packingsupervisor;
  }

  // Avoid a TypeError for roles that are not mapped.
  const normalizedAssignedStages = (assignedStages || []).map((item) =>
    String(
      typeof item === "string"
        ? item
        : item?.stage_code || item?.key || item?.code || "",
    ).toUpperCase(),
  );

  if ((!productionId && !cycleID) || !PRODUCTION_STAGES.includes(stageCode)) {
    return {
      statusCode: 400,
      message: "Valid production ID/cycle ID and process are required",
    };
  }

  if (!isAdmin && !normalizedAssignedStages.includes(stageCode)) {
    return {
      statusCode: 403,
      message: "You are not authorized to update this production stage",
    };
  }

  if (PARTIAL_RELEASE_STAGES.includes(stageCode)) {
    if (
      releaseQty === undefined ||
      releaseQty === null ||
      releaseQty === "" ||
      !Number.isFinite(Number(releaseQty)) ||
      Number(releaseQty) <= 0
    ) {
      return {
        statusCode: 400,
        message: "Enter a valid release quantity greater than zero",
      };
    }
  }

  if (stageCode === "QUALITY") {
    if (
      wastageQty === undefined ||
      wastageQty === null ||
      wastageQty === "" ||
      !Number.isFinite(Number(wastageQty)) ||
      Number(wastageQty) < 0
    ) {
      return { statusCode: 400, message: "Enter a valid wastage quantity" };
    }
  }

  if (stageCode === "PACKING") {
    if (
      actualQtyAtPacking === undefined ||
      actualQtyAtPacking === null ||
      actualQtyAtPacking === "" ||
      !Number.isFinite(Number(actualQtyAtPacking)) ||
      Number(actualQtyAtPacking) <= 0
    ) {
      return { statusCode: 400, message: "Enter the actual packed quantity" };
    }
  }

  return null;
};

export const createProductionError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const validateStartProductionRequest = ({ payload, user }) => {
  if (!user || typeof user !== "object") {
    throw createProductionError(401, "Not authorized");
  }

  const { productionId, process } = payload;

  if (!productionId || !String(process || "").trim()) {
    throw createProductionError(
      400,
      "productionId and process are required",
    );
  }

  return {
    productionId,
    stageCode: String(process).trim().toUpperCase(),
  };
};

export const validateProductionAuthorization = ({
  user,
  stageCode,
  productionDivision,
}) => {
  const role = String(user?.role || "").trim().toLowerCase();
  const isAdmin = role === "admin";

  const allowedStages = ASSIGNED_STAGES_TO_ROLE[role] || [];

  // Stage codes ko consistently UPPERCASE rakho
  const normalizedStageCode = String(stageCode || "")
    .trim()
    .toUpperCase();

  console.log("stageCode:", normalizedStageCode);
  console.log("role:", role);
  console.log("allowedStages:", allowedStages);
  console.log("isMatched:", allowedStages.includes(normalizedStageCode));

  if (!isAdmin && !allowedStages.includes(normalizedStageCode)) {
    throw createProductionError(
      403,
      "You are not authorized to start this stage",
    );
  }

  const userDivision = String(user?.division || "")
    .trim()
    .toUpperCase();

  const actualDivision = String(productionDivision || "")
    .trim()
    .toUpperCase();

  if (
    !isAdmin &&
    userDivision &&
    userDivision !== "ALL" &&
    userDivision !== actualDivision
  ) {
    throw createProductionError(
      403,
      "You are not authorized for this production division",
    );
  }

  return { isAdmin };
};

export const validateProductionStatus = (status) => {
  if (!["PENDING", "IN_PROGRESS"].includes(String(status).toUpperCase())) {
    throw createProductionError(400, "Production cycle is already closed");
  }
};

export const validateTargetQuantity = (targetQty) => {
  const qty = Number(targetQty);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw createProductionError(400, "Invalid production target quantity");
  }

  return qty;
};

export const validateStageAndGetFirst = ({ allStages, stageCode }) => {
  const stage = allStages.find((item) => item.stage_code === stageCode);

  if (!stage) {
    throw createProductionError(404, `${stageCode} stage not found`);
  }

  if (String(stage.status).toUpperCase() !== "PENDING") {
    throw createProductionError(
      400,
      `${stageCode} is not pending; current status is ${stage.status}`,
    );
  }

  const firstStageCode = PRODUCTION_STAGES.find((code) =>
    allStages.some((item) => item.stage_code === code),
  );

  if (!firstStageCode) {
    throw createProductionError(400, "No production stages found for this cycle");
  }

  return {
    stage,
    firstStageCode,
    isFirstStage: stageCode === firstStageCode,
  };
};

export const validateFinishingCanStart = ({ allStages, stageCode }) => {
  if (stageCode !== "FINISHING") return;

  const machineStage = allStages.find(
    (item) => item.stage_code === "MACHINE",
  );

  if (!machineStage || Number(machineStage.released_qty || 0) <= 0) {
    throw createProductionError(
      400,
      "Finishing can start only after Machine releases some quantity",
    );
  }
};

export const validateFirstStageQuantity = ({
  productionQty,
  existingInputQty,
  availableQty,
}) => {
  if (
    productionQty === undefined ||
    productionQty === null ||
    productionQty === "" ||
    !Number.isFinite(Number(productionQty)) ||
    Number(productionQty) <= 0
  ) {
    throw createProductionError(400, "Valid input quantity is required");
  }

  const requestedQty = Number(productionQty);
  const currentQty = Number(existingInputQty || 0);

  if (currentQty > 0 && Math.abs(requestedQty - currentQty) > 0.001) {
    throw createProductionError(
      400,
      `This cycle already has ${currentQty} selected. Enter the same quantity.`,
    );
  }

  if (currentQty <= 0 && requestedQty > availableQty) {
    throw createProductionError(
      400,
      `Only ${availableQty} quantity remains available for allocation`,
    );
  }

  if (currentQty <= 0 && availableQty <= 0) {
    throw createProductionError(
      400,
      "No remaining quantity available for allocation",
    );
  }

  return currentQty > 0 ? currentQty : requestedQty;
};

export const validateOtherStageQuantity = ({ stageCode, inputQty }) => {
  const qty = Number(inputQty || 0);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw createProductionError(
      400,
      `No released quantity is available for ${stageCode} yet`,
    );
  }
    return qty;
};
