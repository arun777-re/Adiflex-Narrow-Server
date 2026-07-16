
// production Columns mapping 
export const PRODUCTION_COLUMNS = {

  SO_NO: 0,
  PRODUCT: 1,
  TARGET_QTY: 2,
  DIVISION: 3,
  PRODUCTION_QTY: 4,

  WARPING: 5,
  WARPING_TIME: 6,

  YARN_BEAM: 7,
  YARN_BEAM_TIME: 8,

  MACHINE: 9,
  MACHINE_TIME: 10,

  QUALITY: 11,
  QUALITY_TIME: 12,

  FINISHING: 13,
  FINISHING_TIME: 14,

  ROLLING: 15,
  ROLLING_TIME: 16,

  PACKING: 17,
  PACKING_TIME: 18,

  STATUS: 19,

  WASTAGE: 20,

  NETT_QTY: 21,

  JOBWORK: 22,
  JOBWORK_TIME: 23,

  UPDATED_BY: 24,
  UPDATED_TIME: 25,

};


export const PROCESS_MAP = {

  warping: {
    order:1,
    previous: null,
    role:"warping",
    status: "F",
    time: "G",
    statusIndex: PRODUCTION_COLUMNS.WARPING,
    timeIndex: PRODUCTION_COLUMNS.WARPING_TIME,
  },

  yarnBeam: {
    order:2,
    previous: "warping",
    status: "H",
    role:"yarnBeam",
    time: "I",
    statusIndex: PRODUCTION_COLUMNS.YARN_BEAM,
    timeIndex: PRODUCTION_COLUMNS.YARN_BEAM_TIME,
  },

  machine: {
    order:3,
    previous: "yarnBeam",
    status: "J",
    role:"machine",
    time: "K",
    statusIndex: PRODUCTION_COLUMNS.MACHINE,
    timeIndex:PRODUCTION_COLUMNS.MACHINE_TIME,
  },

  quality: {
    order:4,
    previous: "machine",
    status: "L",
    role:"quality",
    time: "M",
    statusIndex:PRODUCTION_COLUMNS.QUALITY,
    timeIndex: PRODUCTION_COLUMNS.QUALITY_TIME,
  },

  finishing: {
    order:5,
    previous: "quality",
    status: "N",
    role:"finishing",
    time: "O",
    statusIndex:PRODUCTION_COLUMNS.FINISHING,
    timeIndex: PRODUCTION_COLUMNS.FINISHING_TIME,
  },

  rolling: {
    order:6,
    previous: "finishing",
    status: "P",
    role:"rolling",
    time: "Q",
    statusIndex: PRODUCTION_COLUMNS.ROLLING,
    timeIndex: PRODUCTION_COLUMNS.ROLLING_TIME,
  },

  packing: {
    order:7,
    previous: "rolling",
    status: "R",
    role:"packing",
    time: "S",
    statusIndex:PRODUCTION_COLUMNS.PACKING,
    timeIndex: PRODUCTION_COLUMNS.PACKING_TIME,
  },

  jobWork: {
    order:8,
    previous: null,
    status: "X",
    role:"jobWork",
    time: "Y",
    statusIndex: PRODUCTION_COLUMNS.JOBWORK,
    timeIndex: PRODUCTION_COLUMNS.JOBWORK_TIME,
  },

};