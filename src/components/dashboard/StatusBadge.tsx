"use client";

import { Badge } from "@/components/ui/badge";

type StatusVariant = "partner" | "brand" | "deal";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
}

const colorMap: Record<StatusVariant, Record<string, string>> = {
  partner: {
    Active: "bg-green-100 text-green-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Inactive: "bg-red-100 text-red-800",
    Archived: "bg-gray-100 text-gray-800",
  },
  brand: {
    Active: "bg-green-100 text-green-800",
    Inactive: "bg-red-100 text-red-800",
    Archived: "bg-gray-100 text-gray-800",
  },
  deal: {
    Active: "bg-green-100 text-green-800",
    PendingValidation: "bg-yellow-100 text-yellow-800",
    Ended: "bg-red-100 text-red-800",
    Expired: "bg-gray-100 text-gray-800",
  },
};

const displayLabels: Record<string, string> = {
  PendingValidation: "Pending Validation",
};

export function StatusBadge({ status, variant = "partner" }: StatusBadgeProps) {
  const colors = colorMap[variant]?.[status] ?? "bg-gray-100 text-gray-800";
  const label = displayLabels[status] ?? status;

  return (
    <Badge variant="outline" className={`border-transparent ${colors}`}>
      {label}
    </Badge>
  );
}
