"use client";

import { Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AdminOnlyBannerProps {
  entityType: string;
  adminOnly: boolean;
  onToggle: (value: boolean) => void;
}

export function AdminOnlyBanner({ entityType, adminOnly, onToggle }: AdminOnlyBannerProps) {
  if (!adminOnly) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <Lock className="size-4 shrink-0" />
      <span className="flex-1">
        This {entityType} is only visible to admins.
      </span>
      <label className="flex items-center gap-2 cursor-pointer">
        <span className="text-xs">Admin Only</span>
        <Checkbox checked={adminOnly} onCheckedChange={(checked) => onToggle(checked === true)} />
      </label>
    </div>
  );
}
