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

export const DEAL_STATUS_DESCRIPTIONS: Record<DealStatusType, string> = {
  Unsure: "Deal feasibility is being evaluated",
  InContact: "In discussion with the partner about this deal",
  Approved: "Deal has been approved but not yet fully set up",
  AwaitingPostback: "Deal is approved and waiting for postback configuration",
  FullyImplemented: "Deal is fully set up and ready to go live",
  Live: "Deal is active on the page with a toplist position",
  Inactive: "Deal is not live on the page",
};
