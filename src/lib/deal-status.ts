export const DEAL_STATUSES = [
  "Unsure",
  "InContact",
  "Approved",
  "AwaitingPostback",
  "FullyImplemented",
  "Live",
  "Inactive",
] as const;

export type DealStatusType = (typeof DEAL_STATUSES)[number];

/** Statuses that mean the position is taken (everything except Inactive) */
export const OCCUPYING_STATUSES: DealStatusType[] = [
  "Unsure",
  "InContact",
  "Approved",
  "AwaitingPostback",
  "FullyImplemented",
  "Live",
];

/** Pre-Live statuses (pipeline — deal is being set up but not live yet) */
export const PIPELINE_STATUSES: DealStatusType[] = [
  "Unsure",
  "InContact",
  "Approved",
  "AwaitingPostback",
  "FullyImplemented",
];

export const DEAL_STATUS_LABELS: Record<DealStatusType, string> = {
  Unsure: "Unsure",
  InContact: "In Contact",
  Approved: "Approved",
  AwaitingPostback: "Awaiting Postback",
  FullyImplemented: "Fully Implemented",
  Live: "Live",
  Inactive: "Inactive",
};
