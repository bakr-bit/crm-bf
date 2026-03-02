"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DEAL_STATUS_LABELS, DEAL_STATUS_DESCRIPTIONS } from "@/lib/deal-status";
import { PARTNER_STATUS_LABELS, PARTNER_STATUS_DESCRIPTIONS } from "@/lib/partner-status";

type StatusVariant = "partner" | "brand" | "deal";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
}

const colorMap: Record<StatusVariant, Record<string, string>> = {
  partner: {
    Lead: "bg-gray-100 text-gray-800",
    EstablishedContact: "bg-blue-100 text-blue-800",
    PlatformSignedUp: "bg-indigo-100 text-indigo-800",
    AwaitingKYC: "bg-yellow-100 text-yellow-800",
    AwaitingPostback: "bg-orange-100 text-orange-800",
    Active: "bg-green-100 text-green-800",
  },
  brand: {
    Active: "bg-green-100 text-green-800",
    Inactive: "bg-red-100 text-red-800",
    Archived: "bg-gray-100 text-gray-800",
  },
  deal: {
    Unsure: "bg-gray-100 text-gray-800",
    InContact: "bg-blue-100 text-blue-800",
    Approved: "bg-yellow-100 text-yellow-800",
    AwaitingPostback: "bg-orange-100 text-orange-800",
    FullyImplemented: "bg-purple-100 text-purple-800",
    Live: "bg-green-100 text-green-800",
    Inactive: "bg-red-100 text-red-800",
  },
};

const BRAND_STATUS_DESCRIPTIONS: Record<string, string> = {
  Active: "Brand is currently active and available for deals",
  Inactive: "Brand is not currently active",
  Archived: "Brand has been archived and is no longer in use",
};

function getDescription(status: string, variant: StatusVariant): string | undefined {
  if (variant === "deal") {
    return DEAL_STATUS_DESCRIPTIONS[status as keyof typeof DEAL_STATUS_DESCRIPTIONS];
  }
  if (variant === "partner") {
    return PARTNER_STATUS_DESCRIPTIONS[status as keyof typeof PARTNER_STATUS_DESCRIPTIONS];
  }
  if (variant === "brand") {
    return BRAND_STATUS_DESCRIPTIONS[status];
  }
  return undefined;
}

export function StatusBadge({ status, variant = "partner" }: StatusBadgeProps) {
  const colors = colorMap[variant]?.[status] ?? "bg-gray-100 text-gray-800";
  const label =
    variant === "deal"
      ? DEAL_STATUS_LABELS[status as keyof typeof DEAL_STATUS_LABELS] ?? status
      : variant === "partner"
        ? PARTNER_STATUS_LABELS[status as keyof typeof PARTNER_STATUS_LABELS] ?? status
        : status;

  const description = getDescription(status, variant);

  const badge = (
    <Badge variant="outline" className={`border-transparent ${colors}`}>
      {label}
    </Badge>
  );

  if (!description) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
