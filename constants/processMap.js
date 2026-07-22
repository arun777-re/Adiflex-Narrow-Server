
// =====================================================
// PRODUCTION COLUMNS
// =====================================================

export const PRODUCTION_COLUMNS = {
  SO_NO: 0, 
  SKU_CODE:1,                // A
  PRODUCT: 2,   
  ORDER_TYPE:3,            // B
  TARGET_QTY: 4,            // C
  DIVISION: 5,              // D
  PRODUCTION_QTY: 6,        // E
  JOB_WORK: 7,              // F

  JOB_WORK_START: 8,        // G
  JOB_WORK_END: 9,          // H

  WARPING_START: 10,        // I
  WARPING: 11,               // J
  WARPING_END: 12,          // K

  YARN_BEAM_START: 13,     // L
  YARN_BEAM: 14,            // M
  YARN_BEAM_END: 15,       // N

  MACHINE_START: 16,       // O
  MACHINE: 17,              // P
  MACHINE_END: 18,          // Q

  QUALITY_START: 19,       // R
  QUALITY: 20,              // S
  QUALITY_END: 21,         // T

  // ==========================================
  // WASTAGE MOVED AFTER QUALITY
  // ==========================================

  WASTAGE_QTY: 22,          // U

  // ==========================================
  // FINISHING
  // ==========================================

  FINISHING_START: 23,      // V
  FINISHING: 24,            // W
  FINISHING_END: 25,        // X

  // ==========================================
  // ROLLING
  // ==========================================

  ROLLING_START: 26,        // Y
  ROLLING: 27,              // Z
  ROLLING_END: 28,          // AA

  // ==========================================
  // PACKING
  // ==========================================

  PACKING_START: 29,        // AB
  PACKING:30,              // AC
  PACKING_END: 31,          // AD

  // ==========================================
  // FINAL DATA
  // ==========================================

  STATUS: 32,               // AE
  NETT_QTY_RTD: 33,         // AF
  UPDATED_BY: 34,           // AG
  UPDATED_TIME: 35,         // AH
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

    time: "I",

    endTime: "J",

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

    status: "L",

    time: "K",

    endTime: "M",

    statusIndex:
      PRODUCTION_COLUMNS.WARPING,

    timeIndex:
      PRODUCTION_COLUMNS.WARPING_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.WARPING_END,

  },


  // ==========================================
  // YARN BEAM
  // ==========================================

  yarnBeam: {

    order: 2,

    previous: "warping",

    role: "yarnBeam",

    status: "O",

    time: "N",

    endTime: "O",

    statusIndex:
      PRODUCTION_COLUMNS.YARN_BEAM,

    timeIndex:
      PRODUCTION_COLUMNS.YARN_BEAM_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.YARN_BEAM_END,

  },


  // ==========================================
  // MACHINE
  // ==========================================

  machine: {

    order: 3,

    previous: "yarnBeam",

    role: "machine",

    status: "R",

    time: "Q",

    endTime: "S",

    statusIndex:
      PRODUCTION_COLUMNS.MACHINE,

    timeIndex:
      PRODUCTION_COLUMNS.MACHINE_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.MACHINE_END,

  },


  // ==========================================
  // QUALITY
  // ==========================================

  quality: {

    order: 4,

    previous: "machine",

    role: "quality",

    status: "U",

    time: "T",

    endTime: "V",

    statusIndex:
      PRODUCTION_COLUMNS.QUALITY,

    timeIndex:
      PRODUCTION_COLUMNS.QUALITY_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.QUALITY_END,

  },


  // ==========================================
  // FINISHING
  // ==========================================

  finishing: {

    order: 5,

    previous: "quality",

    role: "finishing",

    status: "Y",

    time: "X",

    endTime: "Z",

    statusIndex:
      PRODUCTION_COLUMNS.FINISHING,

    timeIndex:
      PRODUCTION_COLUMNS.FINISHING_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.FINISHING_END,

  },


  // ==========================================
  // ROLLING
  // ==========================================

  rolling: {

    order: 6,

    previous: "finishing",

    role: "rolling",

    status: "AB",

    time: "AA",

    endTime: "AC",

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

    status: "AE",

    time: "AD",

    endTime: "AF",

    statusIndex:
      PRODUCTION_COLUMNS.PACKING,

    timeIndex:
      PRODUCTION_COLUMNS.PACKING_START,

    endTimeIndex:
      PRODUCTION_COLUMNS.PACKING_END,

  },

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