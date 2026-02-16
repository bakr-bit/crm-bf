"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { GeoFlag } from "@/components/dashboard/GeoFlag";
import { COUNTRY_MAP } from "@/lib/countries";
import { LICENSE_MAP } from "@/lib/licenses";
import { Plus } from "lucide-react";

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

interface BrandDeal {
  dealId: string;
  status: string;
  geo: string;
  asset: { name: string };
  position: { name: string };
  startDate: string;
  endDate: string | null;
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
  const [deals, setDeals] = useState<BrandDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  useEffect(() => {
    if (!open || !brand) {
      setDeals([]);
      return;
    }

    let cancelled = false;
    setLoadingDeals(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/deals?partnerId=${brand.partnerId}&brandId=${brand.brandId}&includeInactive=true`
        );
        if (!res.ok) throw new Error("Failed to fetch deals");
        const json: BrandDeal[] = await res.json();
        if (!cancelled) setDeals(json);
      } catch {
        if (!cancelled) setDeals([]);
      } finally {
        if (!cancelled) setLoadingDeals(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, brand]);

  if (!brand) return null;

  const createDealUrl = `/dashboard/deals?partnerId=${brand.partnerId}&brandId=${brand.brandId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{brand.name}</DialogTitle>
            <StatusBadge status={brand.status} variant="brand" />
          </div>
          <DialogDescription>Brand details</DialogDescription>
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
                      <GeoFlag geo={code} size="sm" showLabel={false} />
                      {COUNTRY_MAP[code] ?? LICENSE_MAP[code] ?? code}
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

        {/* Deals section */}
        <div className="border-t pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Deals
              {!loadingDeals && (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({deals.length})
                </span>
              )}
            </h3>
            <Button size="sm" asChild>
              <Link href={createDealUrl}>
                <Plus className="mr-2 size-4" />
                Create Deal
              </Link>
            </Button>
          </div>

          {loadingDeals ? (
            <div className="h-16 animate-pulse rounded bg-muted" />
          ) : deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No deals for this brand yet.
            </p>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <Link
                  key={deal.dealId}
                  href={`/dashboard/deals/${deal.dealId}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={deal.status} variant="deal" />
                    <span>{deal.asset.name}</span>
                    <span className="text-muted-foreground">{deal.position.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <GeoFlag geo={deal.geo} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(deal.startDate).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
