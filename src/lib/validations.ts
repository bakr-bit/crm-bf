import { z } from "zod";
import { normalizeDomain } from "./utils";

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
  status: z.enum(["Active", "Inactive", "Archived"]).default("Active"),
  targetGeos: z.array(z.string().length(2).toUpperCase()).default([]),
});

export const brandUpdateSchema = brandCreateSchema.partial();

export const contactCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  role: z.string().optional(),
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
  details: z.string().optional(),
});

export const positionUpdateSchema = positionCreateSchema.partial();

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
});

export const dealUpdateSchema = z.object({
  affiliateLink: z.string().optional(),
  geo: z.string().length(2).toUpperCase().optional(),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  status: z.enum(["Active", "PendingValidation", "Ended", "Expired"]).optional(),
  notes: z.string().optional(),
});

export const dealReplaceSchema = z.object({
  existingDealId: z.string().min(1, "Existing deal is required"),
  partnerId: z.string().min(1, "Partner is required"),
  brandId: z.string().min(1, "Brand is required"),
  geo: z.string().length(2).toUpperCase().optional(),
  affiliateLink: z.string().optional(),
  notes: z.string().optional(),
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
