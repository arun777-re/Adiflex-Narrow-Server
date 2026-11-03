

export const PRODUCTION_STAGES = [
  "JOB_WORK",
  "WARPING",
  "FILLING",
  "MACHINE",
  "FINISHING",
  "QUALITY",
  "ROLLING",
  "PACKING",
];

 // These stages support partial releases.
  export const PARTIAL_RELEASE_STAGES = [
    "MACHINE",
    
  ];

  export const ASSIGNED_STAGES_TO_ROLE = {
    productionsupervisor:[
      "JOB_WORK",
      "WARPING",
      "FILLING",
      "MACHINE"
    ],
    qualitysupervisor:[
      "FINISHING",
      "QUALITY",

    ],
    packingsupervisor:[
      "ROLLING",
      "PACKING"
    ]

    }
  