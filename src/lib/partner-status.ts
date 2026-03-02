export const PARTNER_STATUSES = [
  "Lead",
  "EstablishedContact",
  "PlatformSignedUp",
  "AwaitingKYC",
  "AwaitingPostback",
  "Active",
] as const;

export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  Lead: "Lead",
  EstablishedContact: "Established Contact",
  PlatformSignedUp: "Platform Signed Up",
  AwaitingKYC: "Awaiting KYC",
  AwaitingPostback: "Awaiting Postback",
  Active: "Active",
};

export const PARTNER_STATUS_DESCRIPTIONS: Record<PartnerStatus, string> = {
  Lead: "Initial contact — partner has been identified but not yet reached out to",
  EstablishedContact: "Communication has been established with the partner",
  PlatformSignedUp: "Partner has signed up on the affiliate platform",
  AwaitingKYC: "Waiting for the partner to complete KYC verification",
  AwaitingPostback: "Partner is set up but waiting for postback configuration",
  Active: "Partner is fully onboarded and active",
};
