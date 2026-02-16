export const PARTNER_STATUSES = [
  "Lead",
  "EstablishedContact",
  "PlatformSignedUp",
  "AwaitingKYC",
  "AvailableForAsset",
  "AwaitingPostback",
  "Active",
] as const;

export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  Lead: "Lead",
  EstablishedContact: "Established Contact",
  PlatformSignedUp: "Platform Signed Up",
  AwaitingKYC: "Awaiting KYC",
  AvailableForAsset: "Available for Asset",
  AwaitingPostback: "Awaiting Postback",
  Active: "Active",
};
