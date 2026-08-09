export const PRODUCTION_COLUMNS = {
  // ==========================================
  // BASIC
  // ==========================================

  SO_NO: 0,                  // A
  CYCLE_ID: 1,               // B
  SKU_CODE: 2,               // C
  PRODUCT: 3,                // D
  ORDER_TYPE: 4,             // E
  TARGET_QTY: 5,             // F
  DIVISION: 6,               // G
  PRODUCTION_QTY: 7,         // H
  JOB_WORK: 8,               // I

  // ==========================================
  // JOB WORK
  // ==========================================

  JOB_WORK_START: 9,         // J
  JOB_WORK_END: 10,          // K

  // ==========================================
  // WARPING
  // ==========================================

  WARPING_START: 11,         // L
  WARPING: 12,               // M
  WARPING_END: 13,           // N

  // ==========================================
  // FILLING
  // ==========================================

  FILLING_START: 14,         // O
  FILLING: 15,               // P
  FILLING_END: 16,           // Q

  // ==========================================
  // MACHINE
  // ==========================================

  MACHINE_START: 17,         // R
  MACHINE: 18,               // S
  MACHINE_END: 19,           // T

  // ==========================================
  // FINISHING
  // ==========================================

  FINISHING_START: 20,       // U
  FINISHING: 21,             // V
  FINISHING_END: 22,         // W

  // ==========================================
  // QUALITY
  // ==========================================

  QUALITY_START: 23,         // X
  QUALITY: 24,               // Y
  QUALITY_END: 25,           // Z

  // ==========================================
  // WASTAGE
  // ==========================================

  WASTAGE_QTY: 26,            // AA

  // ==========================================
  // ROLLING
  // ==========================================

  ROLLING_START: 27,         // AB
  ROLLING: 28,               // AC
  ROLLING_END: 29,           // AD

  // ==========================================
  // PACKING
  // ==========================================

  PACKING_START: 30,         // AE
  PACKING: 31,               // AF
  PACKING_END: 32,           // AG

  // ==========================================
  // FINAL DATA
  // ==========================================

  STATUS: 33,                // AH
  UPDATED_BY: 34,             // AI
  UPDATED_TIME: 35,           // AJ
};

// =====================================================
// PROCESS MAP
// =====================================================
export const PROCESS_MAP = {

  // ==========================================
  // JOB WORK
  // ==========================================

  jobWork: {
    order: 0,
    previous: null,
    role: "jobWork",

    time: "J",
    endTime: "K",

    timeIndex:
      PRODUCTION_COLUMNS.JOB_WORK_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.JOB_WORK_END,
  },

  // ==========================================
  // WARPING
  // ==========================================

  warping: {
    order: 1,
    previous: "jobWork",
    role: "warping",

    status: "M",
    time: "L",
    endTime: "N",

    statusIndex:
      PRODUCTION_COLUMNS.WARPING,

    timeIndex:
      PRODUCTION_COLUMNS.WARPING_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.WARPING_END,
  },

  // ==========================================
  // FILLING
  // ==========================================

  filling: {
    order: 2,
    previous: "warping",
    role: "filling",

    status: "P",
    time: "O",
    endTime: "Q",

    statusIndex:
      PRODUCTION_COLUMNS.FILLING,

    timeIndex:
      PRODUCTION_COLUMNS.FILLING_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.FILLING_END,
  },

  // ==========================================
  // MACHINE
  // ==========================================

  machine: {
    order: 3,
    previous: "filling",
    role: "machine",

    status: "S",
    time: "R",
    endTime: "T",

    statusIndex:
      PRODUCTION_COLUMNS.MACHINE,

    timeIndex:
      PRODUCTION_COLUMNS.MACHINE_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.MACHINE_END,
  },

  // ==========================================
  // FINISHING
  // ==========================================

  finishing: {
    order: 4,
    previous: "machine",
    role: "finishing",

    status: "V",
    time: "U",
    endTime: "W",

    statusIndex:
      PRODUCTION_COLUMNS.FINISHING,

    timeIndex:
      PRODUCTION_COLUMNS.FINISHING_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.FINISHING_END,
  },

  // ==========================================
  // QUALITY
  // ==========================================

  quality: {
    order: 5,
    previous: "finishing",
    role: "quality",

    status: "Y",
    time: "X",
    endTime: "Z",

    statusIndex:
      PRODUCTION_COLUMNS.QUALITY,

    timeIndex:
      PRODUCTION_COLUMNS.QUALITY_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.QUALITY_END,
  },

  // ==========================================
  // ROLLING
  // ==========================================

  rolling: {
    order: 6,
    previous: "quality",
    role: "rolling",

    status: "AC",
    time: "AB",
    endTime: "AD",

    statusIndex:
      PRODUCTION_COLUMNS.ROLLING,

    timeIndex:
      PRODUCTION_COLUMNS.ROLLING_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.ROLLING_END,
  },

  // ==========================================
  // PACKING
  // ==========================================

  packing: {
    order: 7,
    previous: "rolling",
    role: "packing",

    status: "AF",
    time: "AE",
    endTime: "AG",

    statusIndex:
      PRODUCTION_COLUMNS.PACKING,

    timeIndex:
      PRODUCTION_COLUMNS.PACKING_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.PACKING_END,
  },

};

export const PRODUCTION_SHEET_COLUMNS = {
  PRODUCTION_QTY: "H",
  QUALITY_END:"Z",
  QUAILTY_STATUS:"Y",
  QUALITY_START: "X",
  WASTAGE_QTY: "AA",
  STATUS: "AH",
  UPDATED_BY: "AI",
  UPDATED_TIME: "AJ",
};

export const SALES_ORDER_COLUMNS = {
  SO_NO: 0,
  DATE: 1,
  CUSTOMER: 2,
  PRODUCT_NAME: 3,
  DIVISION: 4,
  SO_QTY: 5,
  RATE: 6,
  UNIT: 7,
  OPENING_FG_QTY: 8,
  PRODUCTION_QTY: 9,
  JOB_WORK: 10,
  MANUFACTURED_QTY: 11,
  DISPATCHED_QTY: 12,
  ORDER_RECEIVED_BY: 13,
  OVERALL_STATUS: 14,
  LOCATION: 15,
};