import { z } from "zod";
import { normalizeDomain } from "./utils";
import { DEAL_STATUSES } from "./deal-status";
import { PARTNER_STATUSES } from "./partner-status";

const domainTransform = z.string().optional().transform((val) => {
  if (!val || val.trim() === "") return undefined;
  return normalizeDomain(val);
});

export const partnerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  websiteDomain: domainTransform,
  isDirect: z.boolean().default(false),
  status: z.enum(PARTNER_STATUSES).default("Lead"),
  hasContract: z.boolean().default(false),
  hasLicense: z.boolean().default(false),
  hasBanking: z.boolean().default(false),
  sopNotes: z.string().optional(),
  lastInvoicedAt: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  accountManagerUserId: z.string().optional(),
  force: z.boolean().default(false),
});

export const partnerUpdateSchema = partnerCreateSchema.partial().extend({
  adminOnly: z.boolean().optional(),
});

export const brandCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brandDomain: domainTransform,
  brandIdentifiers: z.any().optional(),
  postbacks: z.array(z.string()).default([]),
  licenses: z.array(z.string()).default([]),
  extraInfo: z.string().optional(),
  affiliateSoftware: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Archived"]).default("Active"),
  targetGeos: z.array(z.string().length(2).toUpperCase()).default([]),
});

export const brandUpdateSchema = brandCreateSchema.partial().extend({
  adminOnly: z.boolean().optional(),
});

export const contactCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
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
  geos: z.array(z.string().length(2).toUpperCase()).default([]),
});

export const assetUpdateSchema = assetCreateSchema.partial().extend({
  adminOnly: z.boolean().optional(),
});

export const pageCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  path: z.string().optional(),
  description: z.string().optional(),
});

export const pageUpdateSchema = pageCreateSchema.partial();

export const positionCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  details: z.string().optional(),
});

export const positionUpdateSchema = positionCreateSchema.partial();

export const positionConvertSchema = z.object({
  name: z.string().min(1, "Position name is required")
    .refine((val) => val !== "N/A", "Cannot convert to N/A"),
  details: z.string().optional(),
});

// Deal terms shared shape
const dealTermsField = {
  dealTerms: z.string().optional(),
};

export const dealCreateSchema = z.object({
  partnerId: z.string().min(1, "Partner is required"),
  brandId: z.string().min(1, "Brand is required"),
  assetId: z.string().min(1, "Asset is required"),
  pageId: z.string().min(1, "Page is required"),
  positionId: z.string().optional().nullable(),
  geo: z.string().length(2).toUpperCase(),
  affiliateLink: z.string().optional(),
  affiliateLinkId: z.string().optional().nullable(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : new Date()),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  notes: z.string().optional(),
  status: z.enum(DEAL_STATUSES).default("Inactive"),
  ...dealTermsField,
});

export const dealUpdateSchema = z.object({
  affiliateLink: z.string().optional(),
  affiliateLinkId: z.string().optional().nullable(),
  geo: z.string().length(2).toUpperCase().optional(),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  status: z.enum(DEAL_STATUSES).optional(),
  notes: z.string().optional(),
  adminOnly: z.boolean().optional(),
  ...dealTermsField,
});

export const dealReplaceSchema = z.object({
  existingDealId: z.string().min(1, "Existing deal is required"),
  partnerId: z.string().min(1, "Partner is required"),
  brandId: z.string().min(1, "Brand is required"),
  geo: z.string().length(2).toUpperCase().optional(),
  affiliateLink: z.string().optional(),
  affiliateLinkId: z.string().optional().nullable(),
  replacementReason: z.string().min(1, "Replacement reason is required"),
  notes: z.string().optional(),
  ...dealTermsField,
});

// Affiliate link schemas
export const affiliateLinkCreateSchema = z.object({
  label: z.string().min(1, "Label is required"),
  url: z.string().min(1, "URL is required"),
  geo: z.string().default("__global"),
});
export const affiliateLinkUpdateSchema = affiliateLinkCreateSchema.partial();

// Wishlist schemas
export const wishlistItemCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  geo: z.string().min(1, "Geo is required"),
  assetId: z.string().optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
  assignedToUserId: z.string().optional().nullable(),
});

export const wishlistItemUpdateSchema = wishlistItemCreateSchema.partial().extend({
  contacted: z.boolean().optional(),
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
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  password: z.string().min(1, "Password is required"),
  softwareType: z.string().optional(),
  notes: z.string().optional(),
  geo: z.string().optional().nullable(),
});

export const credentialUpdateSchema = credentialCreateSchema.partial();

// Intake schemas
export const intakeLinkCreateSchema = z.object({
  note: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  maxUses: z.number().int().min(1).max(1000).default(1),
});

export const intakeBrandSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  brandDomain: domainTransform,
  targetGeos: z.array(z.string().length(2).toUpperCase()).default([]),
  licenses: z.array(z.string()).default([]),
});

export const intakeSubmissionCreateSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  websiteDomain: domainTransform,
  brands: z.array(intakeBrandSchema).min(1, "At least one brand is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactTelegram: z.string().optional(),
  contactWhatsapp: z.string().optional(),
  preferredContact: z.enum(["Email", "Telegram", "WhatsApp", "Phone"]).optional(),
  notes: z.string().optional(),
}).refine(
  (data) =>
    (data.contactEmail && data.contactEmail !== "") ||
    (data.contactTelegram && data.contactTelegram !== "") ||
    (data.contactWhatsapp && data.contactWhatsapp !== ""),
  { message: "At least one of Email, Telegram, or WhatsApp is required", path: ["contactEmail"] }
);

export const intakeConvertSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  force: z.boolean().default(false),
  partnerStatus: z.enum(PARTNER_STATUSES).default("Lead"),
  isDirect: z.boolean().default(false),
});
