"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { GeoFlag } from "@/components/dashboard/GeoFlag";
import { LICENSE_MAP } from "@/lib/licenses";

interface Brand {
  brandId: string;
  partnerId: string;
  name: string;
  brandDomain: string | null;
  brandIdentifiers: unknown;
  postbacks: string | null;
  licenses: string[];
  extraInfo: string | null;
  affiliateSoftware: string | null;
  status: string;
  targetGeos: string[];
  createdAt: string;
  updatedAt: string;
}

interface BrandDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand | null;
}

function renderIdentifiers(identifiers: unknown) {
  if (!identifiers || typeof identifiers !== "object") return "None";
  const entries = Object.entries(identifiers as Record<string, unknown>);
  if (entries.length === 0) return "None";
  return (
    <dl className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2 text-sm">
          <dt className="font-medium">{key}:</dt>
          <dd className="text-muted-foreground">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BrandDetailDialog({
  open,
  onOpenChange,
  brand,
}: BrandDetailDialogProps) {
  if (!brand) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{brand.name}</DialogTitle>
            <StatusBadge status={brand.status} variant="brand" />
          </div>
          <DialogDescription>Brand details (read-only)</DialogDescription>
        </DialogHeader>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Domain
            </dt>
            <dd className="text-sm">
              {brand.brandDomain ? (
                <a
                  href={
                    brand.brandDomain.startsWith("http")
                      ? brand.brandDomain
                      : `https://${brand.brandDomain}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {brand.brandDomain}
                </a>
              ) : (
                "Not set"
              )}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Affiliate Software
            </dt>
            <dd className="text-sm">
              {brand.affiliateSoftware ?? "Not set"}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              Licenses
            </dt>
            <dd className="mt-1">
              {(brand.licenses?.length ?? 0) === 0 ? (
                <span className="text-sm text-muted-foreground">None</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {brand.licenses.map((code) => (
                    <Badge key={code} variant="outline" className="text-xs">
                      {LICENSE_MAP[code] ?? code}
                    </Badge>
                  ))}
                </div>
              )}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              Target Geos
            </dt>
            <dd className="mt-1">
              {(brand.targetGeos?.length ?? 0) === 0 ? (
                <span className="text-sm text-muted-foreground">None</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {brand.targetGeos.map((geo) => (
                    <Badge
                      key={geo}
                      variant="outline"
                      className="text-xs"
                    >
                      <GeoFlag geo={geo} size="sm" />
                    </Badge>
                  ))}
                </div>
              )}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              Brand Identifiers
            </dt>
            <dd className="mt-1 text-sm">
              {renderIdentifiers(brand.brandIdentifiers)}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              Postbacks
            </dt>
            <dd className="text-sm whitespace-pre-wrap">
              {brand.postbacks ?? "None"}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              Extra Info
            </dt>
            <dd className="text-sm whitespace-pre-wrap">
              {brand.extraInfo ?? "None"}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Created
            </dt>
            <dd className="text-sm">
              {new Date(brand.createdAt).toLocaleDateString()}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Updated
            </dt>
            <dd className="text-sm">
              {new Date(brand.updatedAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
