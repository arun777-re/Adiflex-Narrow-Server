
export const PRODUCTION_COLUMNS = {
  SO_NO: 0,                 // A
  PRODUCT: 1,               // B
  TARGET_QTY: 2,            // C
  DIVISION: 3,              // D
  PRODUCTION_QTY: 4,        // E
  JOB_WORK: 5,              // F
  JOB_WORK_START: 6,        // G
  JOB_WORK_END: 7,          // H
  WARPING_START: 8,        // I
  WARPING: 9,               // J
  WARPING_END: 10,         // K
  YARN_BEAM_START: 11,     // L
  YARN_BEAM: 12,            // M
  YARN_BEAM_END: 13,       // N
  MACHINE_START: 14,       // O
  MACHINE: 15,             // P
  MACHINE_END: 16,         // Q
  QUALITY_START: 17,       // R
  QUALITY: 18,             // S
  QUALITY_END: 19,         // T
  FINISHING_START: 20,     // U
  FINISHING: 21,            // V
  FINISHING_END: 22,       // W
  ROLLING_START: 23,       // X
  ROLLING: 24,             // Y
  ROLLING_END: 25,         // Z
  PACKING_START: 26,       // AA
  PACKING: 27,             // AB
  PACKING_END: 28,         // AC
  STATUS: 29,              // AD
  WASTAGE_QTY: 30,        // AE
  NETT_QTY_RTD: 31,       // AF
  UPDATED_BY: 32,          // AG
  UPDATED_TIME: 33,        // AH
};


export const PROCESS_MAP = {
jobWork: {
  order: 0,

  previous: null,

  role: "jobWork",

  time: "G",

  endTime: "H",

  timeIndex:
    PRODUCTION_COLUMNS.JOB_WORK_START,

  endTimeIndex:
    PRODUCTION_COLUMNS.JOB_WORK_END,
},

  warping: {
    order: 1,
    previous: "jobWork",

    role: "warping",

    status: "J",
    time: "I",
    endTime: "K",

    statusIndex: PRODUCTION_COLUMNS.WARPING,
    timeIndex: PRODUCTION_COLUMNS.WARPING_START,
    endTimeIndex: PRODUCTION_COLUMNS.WARPING_END,
  },

  yarnBeam: {
    order: 2,
    previous: "warping",

    role: "yarnBeam",

    status: "M",
    time: "L",
    endTime: "N",

    statusIndex: PRODUCTION_COLUMNS.YARN_BEAM,
    timeIndex: PRODUCTION_COLUMNS.YARN_BEAM_START,
    endTimeIndex: PRODUCTION_COLUMNS.YARN_BEAM_END,
  },

  machine: {
    order: 3,
    previous: "yarnBeam",

    role: "machine",

    status: "P",
    time: "O",
    endTime: "Q",

    statusIndex: PRODUCTION_COLUMNS.MACHINE,
    timeIndex: PRODUCTION_COLUMNS.MACHINE_START,
    endTimeIndex: PRODUCTION_COLUMNS.MACHINE_END,
  },

  quality: {
    order: 4,
    previous: "machine",

    role: "quality",

    status: "S",
    time: "R",
    endTime: "T",

    statusIndex: PRODUCTION_COLUMNS.QUALITY,
    timeIndex: PRODUCTION_COLUMNS.QUALITY_START,
    endTimeIndex: PRODUCTION_COLUMNS.QUALITY_END,
  },

  finishing: {
    order: 5,
    previous: "quality",

    role: "finishing",

    status: "V",
    time: "U",
    endTime: "W",

    statusIndex: PRODUCTION_COLUMNS.FINISHING,
    timeIndex: PRODUCTION_COLUMNS.FINISHING_START,
    endTimeIndex: PRODUCTION_COLUMNS.FINISHING_END,
  },

  rolling: {
    order: 6,
    previous: "finishing",

    role: "rolling",

    status: "Y",
    time: "X",
    endTime: "Z",

    statusIndex: PRODUCTION_COLUMNS.ROLLING,
    timeIndex: PRODUCTION_COLUMNS.ROLLING_START,
    endTimeIndex: PRODUCTION_COLUMNS.ROLLING_END,
  },

  packing: {
    order: 7,
    previous: "rolling",

    role: "packing",

    status: "AB",
    time: "AA",
    endTime: "AC",

    statusIndex: PRODUCTION_COLUMNS.PACKING,
    timeIndex: PRODUCTION_COLUMNS.PACKING_START,
    endTimeIndex: PRODUCTION_COLUMNS.PACKING_END,
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