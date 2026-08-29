export const PRODUCTION_COLUMNS = {
  // ==========================================
  // BASIC
  // ==========================================

  SO_NO: 0,                  // A
  CYCLE_ID: 1,               // B
  SKU_CODE: 2,               // C
  PRODUCT: 3,
  CUSTOMER:4,                // D
  ORDER_TYPE: 5,             // E
  TARGET_QTY: 6,             // F
  DIVISION: 7,               // G
  PRODUCTION_QTY: 8,         // H
  JOB_WORK: 9,               // I

  // ==========================================
  // JOB WORK
  // ==========================================

  JOB_WORK_START: 10,         // J
  JOB_WORK_END: 11,          // K

  // ==========================================
  // WARPING
  // ==========================================

  WARPING_START: 12,         // L
  WARPING: 13,               // M
  WARPING_END: 14,           // N

  // ==========================================
  // FILLING
  // ==========================================

  FILLING_START: 15,         // O
  FILLING: 16,               // P
  FILLING_END: 17,           // Q

  // ==========================================
  // MACHINE
  // ==========================================

  MACHINE_START: 18,         // R
  MACHINE: 19,               // S
  MACHINE_END: 20,           // T

  // ==========================================
  // FINISHING
  // ==========================================

  FINISHING_START: 21,       // U
  FINISHING: 22,             // V
  FINISHING_END: 23,         // W

  // ==========================================
  // QUALITY
  // ==========================================

  QUALITY_START: 24,         // X
  QUALITY: 25,               // Y
  QUALITY_END: 26,           // Z

  // ==========================================
  // WASTAGE
  // ==========================================

  WASTAGE_QTY: 27,            // AA

  // ==========================================
  // ROLLING
  // ==========================================

  ROLLING_START: 28,         // AB
  ROLLING: 29,               // AC
  ROLLING_END: 30,           // AD

  // ==========================================
  // PACKING
  // ==========================================

  PACKING_START: 31,         // AE
  PACKING: 32,               // AF
  PACKING_END: 33,           // AG

  // ==========================================
  // FINAL DATA
  // ==========================================

  STATUS: 34,                // AH
  UPDATED_BY: 35,             // AI
  UPDATED_TIME: 36,           // AJ
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

    status: null,

    time: "K",
    endTime: "L",

    timeIndex: PRODUCTION_COLUMNS.JOB_WORK_START,
    endTimeIndex: PRODUCTION_COLUMNS.JOB_WORK_END,
  },

  // ==========================================
  // WARPING
  // ==========================================

  warping: {
    order: 1,
    previous: "jobWork",
    role: "warping",

    status: "N",
    time: "M",
    endTime: "O",

    statusIndex: PRODUCTION_COLUMNS.WARPING,
    timeIndex: PRODUCTION_COLUMNS.WARPING_START,
    endTimeIndex: PRODUCTION_COLUMNS.WARPING_END,
  },

  // ==========================================
  // FILLING
  // ==========================================

  filling: {
    order: 2,
    previous: "warping",
    role: "filling",

    status: "Q",
    time: "P",
    endTime: "R",

    statusIndex: PRODUCTION_COLUMNS.FILLING,
    timeIndex: PRODUCTION_COLUMNS.FILLING_START,
    endTimeIndex: PRODUCTION_COLUMNS.FILLING_END,
  },

  // ==========================================
  // MACHINE
  // ==========================================

  machine: {
    order: 3,
    previous: "filling",
    role: "machine",

    status: "T",
    time: "S",
    endTime: "U",

    statusIndex: PRODUCTION_COLUMNS.MACHINE,
    timeIndex: PRODUCTION_COLUMNS.MACHINE_START,
    endTimeIndex: PRODUCTION_COLUMNS.MACHINE_END,
  },

  // ==========================================
  // FINISHING
  // ==========================================

  finishing: {
    order: 4,
    previous: "machine",
    role: "finishing",

    status: "W",
    time: "V",
    endTime: "X",

    statusIndex: PRODUCTION_COLUMNS.FINISHING,
    timeIndex: PRODUCTION_COLUMNS.FINISHING_START,
    endTimeIndex: PRODUCTION_COLUMNS.FINISHING_END,
  },

  // ==========================================
  // QUALITY
  // ==========================================

  quality: {
    order: 5,
    previous: "finishing",
    role: "quality",

    status: "Z",
    time: "Y",
    endTime: "AA",

    statusIndex: PRODUCTION_COLUMNS.QUALITY,
    timeIndex: PRODUCTION_COLUMNS.QUALITY_START,
    endTimeIndex: PRODUCTION_COLUMNS.QUALITY_END,
  },

  // ==========================================
  // ROLLING
  // ==========================================

  rolling: {
    order: 6,
    previous: "quality",
    role: "rolling",

    status: "AD",
    time: "AC",
    endTime: "AE",

    statusIndex: PRODUCTION_COLUMNS.ROLLING,
    timeIndex: PRODUCTION_COLUMNS.ROLLING_START,
    endTimeIndex: PRODUCTION_COLUMNS.ROLLING_END,
  },

  // ==========================================
  // PACKING
  // ==========================================

  packing: {
    order: 7,
    previous: "rolling",
    role: "packing",

    status: "AG",
    time: "AF",
    endTime: "AH",

    statusIndex: PRODUCTION_COLUMNS.PACKING,
    timeIndex: PRODUCTION_COLUMNS.PACKING_START,
    endTimeIndex: PRODUCTION_COLUMNS.PACKING_END,
  },
};


// =====================================================
// PRODUCTION SHEET COLUMNS
// =====================================================

export const PRODUCTION_SHEET_COLUMNS = {
  // ==========================================
  // BASIC
  // ==========================================

  SO_NO: "A",
  CYCLE_ID: "B",
  SKU_CODE: "C",
  PRODUCT: "D",
  CUSTOMER: "E",
  ORDER_TYPE: "F",
  TARGET_QTY: "G",
  DIVISION: "H",
  PRODUCTION_QTY: "I",
  JOB_WORK: "J",

  // ==========================================
  // JOB WORK
  // ==========================================

  JOB_WORK_START: "K",
  JOB_WORK_END: "L",

  // ==========================================
  // WARPING
  // ==========================================

  WARPING_START: "M",
  WARPING_STATUS: "N",
  WARPING_END: "O",

  // ==========================================
  // FILLING
  // ==========================================

  FILLING_START: "P",
  FILLING_STATUS: "Q",
  FILLING_END: "R",

  // ==========================================
  // MACHINE
  // ==========================================

  MACHINE_START: "S",
  MACHINE_STATUS: "T",
  MACHINE_END: "U",

  // ==========================================
  // FINISHING
  // ==========================================

  FINISHING_START: "V",
  FINISHING_STATUS: "W",
  FINISHING_END: "X",

  // ==========================================
  // QUALITY
  // ==========================================

  QUALITY_START: "Y",
  QUALITY_STATUS: "Z",
  QUALITY_END: "AA",

  // ==========================================
  // WASTAGE
  // ==========================================

  WASTAGE_QTY: "AB",

  // ==========================================
  // ROLLING
  // ==========================================

  ROLLING_START: "AC",
  ROLLING_STATUS: "AD",
  ROLLING_END: "AE",

  // ==========================================
  // PACKING
  // ==========================================

  PACKING_START: "AF",
  PACKING_STATUS: "AG",
  PACKING_END: "AH",

  // ==========================================
  // FINAL DATA
  // ==========================================

  STATUS: "AI",
  UPDATED_BY: "AJ",
  UPDATED_TIME: "AK",
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