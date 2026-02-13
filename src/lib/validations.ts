import { z } from "zod";
import { normalizeDomain } from "./utils";
import { DEAL_STATUSES } from "./deal-status";

const domainTransform = z.string().optional().transform((val) => {
  if (!val || val.trim() === "") return undefined;
  return normalizeDomain(val);
});

export const partnerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  websiteDomain: domainTransform,
  isDirect: z.boolean().default(false),
  status: z.enum(["Active", "Pending", "Inactive", "Archived"]).default("Pending"),
  hasContract: z.boolean().default(false),
  hasLicense: z.boolean().default(false),
  hasBanking: z.boolean().default(false),
  sopNotes: z.string().optional(),
  force: z.boolean().default(false),
});

export const partnerUpdateSchema = partnerCreateSchema.partial();

export const brandCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brandDomain: domainTransform,
  trackingDomain: domainTransform,
  brandIdentifiers: z.any().optional(),
  postbacks: z.string().optional(),
  licenseInfo: z.string().optional(),
  extraInfo: z.string().optional(),
  affiliateSoftware: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Archived"]).default("Active"),
  targetGeos: z.array(z.string().length(2).toUpperCase()).default([]),
});

export const brandUpdateSchema = brandCreateSchema.partial();

export const contactCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  role: z.string().optional(),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  preferredContact: z.enum(["Email", "Telegram", "WhatsApp", "Phone"]).optional(),
  geo: z.string().optional(),
});

export const contactUpdateSchema = contactCreateSchema.partial();

export const assetCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  assetDomain: domainTransform,
  description: z.string().optional(),
});

export const assetUpdateSchema = assetCreateSchema.partial();

export const positionCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  path: z.string().optional(),
  details: z.string().optional(),
});

export const positionUpdateSchema = positionCreateSchema.partial();

// Deal financial fields shared shape
const dealFinancialFields = {
  payoutModel: z.string().optional(),
  payoutValue: z.string().optional(),
  currency: z.string().optional(),
  baseline: z.string().optional(),
  conversionFlow: z.string().optional(),
  cap: z.string().optional(),
  holdPeriod: z.string().optional(),
  hasLocalLicense: z.boolean().default(false),
};

export const dealCreateSchema = z.object({
  partnerId: z.string().min(1, "Partner is required"),
  brandId: z.string().min(1, "Brand is required"),
  assetId: z.string().min(1, "Asset is required"),
  positionId: z.string().min(1, "Position is required"),
  geo: z.string().length(2).toUpperCase(),
  affiliateLink: z.string().optional(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : new Date()),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  notes: z.string().optional(),
  ...dealFinancialFields,
});

export const dealUpdateSchema = z.object({
  affiliateLink: z.string().optional(),
  geo: z.string().length(2).toUpperCase().optional(),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  status: z.enum(DEAL_STATUSES).optional(),
  notes: z.string().optional(),
  ...dealFinancialFields,
});

export const dealReplaceSchema = z.object({
  existingDealId: z.string().min(1, "Existing deal is required"),
  partnerId: z.string().min(1, "Partner is required"),
  brandId: z.string().min(1, "Brand is required"),
  geo: z.string().length(2).toUpperCase().optional(),
  affiliateLink: z.string().optional(),
  replacementReason: z.string().min(1, "Replacement reason is required"),
  notes: z.string().optional(),
  ...dealFinancialFields,
});

export const scanAssetSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
});

export const confirmScanItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  action: z.enum(["Confirmed", "Ignored"]),
  partnerId: z.string().optional(),
  brandId: z.string().optional(),
  positionId: z.string().optional(),
});

// Admin user creation schema
export const adminCreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Credential schemas
export const credentialCreateSchema = z.object({
  label: z.string().min(1, "Label is required"),
  loginUrl: z.string().optional(),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  softwareType: z.string().optional(),
  notes: z.string().optional(),
});

export const credentialUpdateSchema = credentialCreateSchema.partial();

// Intake schemas
export const intakeLinkCreateSchema = z.object({
  note: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const intakeSubmissionCreateSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  websiteDomain: domainTransform,
  brandName: z.string().min(1, "Brand name is required"),
  brandDomain: domainTransform,
  trackingDomain: domainTransform,
  targetGeos: z.array(z.string().length(2).toUpperCase()).default([]),
  licenseInfo: z.string().optional(),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email"),
  contactPhone: z.string().optional(),
  contactTelegram: z.string().optional(),
  preferredContact: z.enum(["Email", "Telegram", "WhatsApp", "Phone"]).optional(),
  notes: z.string().optional(),
});

export const intakeConvertSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  force: z.boolean().default(false),
  partnerStatus: z.enum(["Active", "Pending", "Inactive"]).default("Pending"),
  isDirect: z.boolean().default(false),
});
