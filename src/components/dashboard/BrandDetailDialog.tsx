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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

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

interface AffiliateLink {
  affiliateLinkId: string;
  brandId: string;
  label: string;
  url: string;
  geo: string;
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

  // Affiliate links state
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [loadingAffLinks, setLoadingAffLinks] = useState(false);
  const [showAddAffLink, setShowAddAffLink] = useState(false);
  const [newAffLabel, setNewAffLabel] = useState("");
  const [newAffUrl, setNewAffUrl] = useState("");
  const [newAffGeo, setNewAffGeo] = useState("__global");
  const [savingAffLink, setSavingAffLink] = useState(false);
  const [editingAffLinkId, setEditingAffLinkId] = useState<string | null>(null);
  const [editAffLabel, setEditAffLabel] = useState("");
  const [editAffUrl, setEditAffUrl] = useState("");
  const [editAffGeo, setEditAffGeo] = useState("__global");

  const COUNTRIES_LIST = [{ code: "__global", name: "Global" }, ...Object.entries(COUNTRY_MAP).map(([code, name]) => ({ code, name }))];

  async function fetchAffiliateLinks(brandId: string) {
    setLoadingAffLinks(true);
    try {
      const res = await fetch(`/api/brands/${brandId}/affiliate-links`);
      if (!res.ok) throw new Error("Failed to fetch affiliate links");
      const json: AffiliateLink[] = await res.json();
      setAffiliateLinks(json);
    } catch {
      setAffiliateLinks([]);
    } finally {
      setLoadingAffLinks(false);
    }
  }

  async function handleAddAffiliateLink() {
    if (!brand || !newAffLabel.trim() || !newAffUrl.trim()) return;
    setSavingAffLink(true);
    try {
      const res = await fetch(`/api/brands/${brand.brandId}/affiliate-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newAffLabel.trim(), url: newAffUrl.trim(), geo: newAffGeo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create affiliate link");
      }
      toast.success("Affiliate link added.");
      setNewAffLabel("");
      setNewAffUrl("");
      setNewAffGeo("__global");
      setShowAddAffLink(false);
      fetchAffiliateLinks(brand.brandId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add affiliate link");
    } finally {
      setSavingAffLink(false);
    }
  }

  async function handleUpdateAffiliateLink(affiliateLinkId: string) {
    if (!brand || !editAffLabel.trim() || !editAffUrl.trim()) return;
    setSavingAffLink(true);
    try {
      const res = await fetch(`/api/brands/${brand.brandId}/affiliate-links/${affiliateLinkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editAffLabel.trim(), url: editAffUrl.trim(), geo: editAffGeo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update affiliate link");
      }
      toast.success("Affiliate link updated.");
      setEditingAffLinkId(null);
      fetchAffiliateLinks(brand.brandId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update affiliate link");
    } finally {
      setSavingAffLink(false);
    }
  }

  async function handleDeleteAffiliateLink(affiliateLinkId: string) {
    if (!brand) return;
    try {
      const res = await fetch(`/api/brands/${brand.brandId}/affiliate-links/${affiliateLinkId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete affiliate link");
      }
      toast.success("Affiliate link deleted.");
      fetchAffiliateLinks(brand.brandId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete affiliate link");
    }
  }

  useEffect(() => {
    if (!open || !brand) {
      setDeals([]);
      setAffiliateLinks([]);
      setShowAddAffLink(false);
      setEditingAffLinkId(null);
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

    fetchAffiliateLinks(brand.brandId);

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

        {/* Affiliate Links section */}
        <div className="border-t pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Affiliate Links
              {!loadingAffLinks && (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({affiliateLinks.length})
                </span>
              )}
            </h3>
            <Button size="sm" variant="outline" onClick={() => setShowAddAffLink(!showAddAffLink)}>
              <Plus className="mr-2 size-4" />
              Add
            </Button>
          </div>

          {showAddAffLink && (
            <div className="mb-3 space-y-2 rounded-md border p-3">
              <Input
                placeholder="Label"
                value={newAffLabel}
                onChange={(e) => setNewAffLabel(e.target.value)}
              />
              <Input
                placeholder="URL"
                value={newAffUrl}
                onChange={(e) => setNewAffUrl(e.target.value)}
              />
              <Select value={newAffGeo} onValueChange={setNewAffGeo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES_LIST.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="inline-flex items-center gap-2">
                        <GeoFlag geo={c.code} size="sm" showLabel={false} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddAffLink(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddAffiliateLink} disabled={savingAffLink || !newAffLabel.trim() || !newAffUrl.trim()}>
                  {savingAffLink ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}

          {loadingAffLinks ? (
            <div className="h-16 animate-pulse rounded bg-muted" />
          ) : affiliateLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No affiliate links for this brand yet.
            </p>
          ) : (
            <div className="space-y-2">
              {affiliateLinks.map((link) =>
                editingAffLinkId === link.affiliateLinkId ? (
                  <div key={link.affiliateLinkId} className="space-y-2 rounded-md border p-3">
                    <Input
                      placeholder="Label"
                      value={editAffLabel}
                      onChange={(e) => setEditAffLabel(e.target.value)}
                    />
                    <Input
                      placeholder="URL"
                      value={editAffUrl}
                      onChange={(e) => setEditAffUrl(e.target.value)}
                    />
                    <Select value={editAffGeo} onValueChange={setEditAffGeo}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES_LIST.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="inline-flex items-center gap-2">
                              <GeoFlag geo={c.code} size="sm" showLabel={false} />
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingAffLinkId(null)}>
                        <X className="size-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleUpdateAffiliateLink(link.affiliateLinkId)} disabled={savingAffLink}>
                        <Check className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={link.affiliateLinkId}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GeoFlag geo={link.geo} size="sm" />
                      <span className="font-medium">{link.label}</span>
                      <span className="truncate text-muted-foreground text-xs">{link.url}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingAffLinkId(link.affiliateLinkId);
                          setEditAffLabel(link.label);
                          setEditAffUrl(link.url);
                          setEditAffGeo(link.geo);
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteAffiliateLink(link.affiliateLinkId)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

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
