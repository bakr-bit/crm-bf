"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { GeoFlag } from "@/components/dashboard/GeoFlag";
import { COUNTRIES } from "@/lib/countries";
import { DEAL_STATUSES, DEAL_STATUS_LABELS } from "@/lib/deal-status";
import type { DealStatusType } from "@/lib/deal-status";

interface EditDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  dealId: string;
}

interface AffiliateLink {
  affiliateLinkId: string;
  label: string;
  url: string;
  geo: string;
}

interface DealData {
  dealId: string;
  brandId: string;
  affiliateLink: string | null;
  affiliateLinkId: string | null;
  geo: string;
  status: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  dealTerms: string | null;
  partner: { name: string };
  brand: { name: string };
  asset: { name: string };
  page: { name: string };
  position: { name: string } | null;
}

export function EditDealDialog({
  open,
  onOpenChange,
  onSuccess,
  dealId,
}: EditDealDialogProps) {
  const [deal, setDeal] = useState<DealData | null>(null);
  const [loadingDeal, setLoadingDeal] = useState(false);

  // Affiliate links
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [affiliateLinkId, setAffiliateLinkId] = useState("");
  const [loadingAffiliateLinks, setLoadingAffiliateLinks] = useState(false);

  // Editable fields
  const [affiliateLink, setAffiliateLink] = useState("");
  const [geo, setGeo] = useState("");
  const [status, setStatus] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [dealTerms, setDealTerms] = useState("");

  const [saving, setSaving] = useState(false);

  // Fetch deal data when dialog opens
  useEffect(() => {
    if (!open || !dealId) return;

    let cancelled = false;
    setLoadingDeal(true);

    (async () => {
      try {
        const res = await fetch(`/api/deals/${dealId}`);
        if (!res.ok) throw new Error("Failed to fetch deal");
        const data: DealData = await res.json();
        if (cancelled) return;

        setDeal(data);
        setAffiliateLink(data.affiliateLink ?? "");
        setAffiliateLinkId(data.affiliateLinkId ?? "");
        setGeo(data.geo ?? "");

        // Fetch affiliate links for the brand
        if (data.brandId) {
          setLoadingAffiliateLinks(true);
          try {
            const affRes = await fetch(`/api/brands/${data.brandId}/affiliate-links`);
            if (affRes.ok) {
              const affJson: AffiliateLink[] = await affRes.json();
              if (!cancelled) {
                setAffiliateLinks(affJson);
                if (data.affiliateLinkId) {
                  setAffiliateLinkId(data.affiliateLinkId);
                }
              }
            }
          } catch { /* ignore */ }
          finally {
            if (!cancelled) setLoadingAffiliateLinks(false);
          }
        }
        setStatus(data.status ?? "");
        setEndDate(data.endDate ? data.endDate.slice(0, 10) : "");
        setNotes(data.notes ?? "");
        setDealTerms(data.dealTerms ?? "");
      } catch {
        toast.error("Failed to load deal details.");
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoadingDeal(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, dealId, onOpenChange]);

  async function handleSubmit() {
    setSaving(true);

    const body: Record<string, unknown> = {
      affiliateLink: affiliateLink.trim() || undefined,
      affiliateLinkId: affiliateLinkId && affiliateLinkId !== "__none" ? affiliateLinkId : null,
      geo: geo || undefined,
      status: status || undefined,
      endDate: endDate || undefined,
      notes: notes.trim() || undefined,
      dealTerms: dealTerms.trim() || undefined,
    };

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update deal.");
      }

      toast.success("Deal updated.");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>

        {loadingDeal ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Loading deal...
          </div>
        ) : deal ? (
          <>
            {/* Read-only context */}
            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">Partner:</span> {deal.partner.name}</div>
              <div><span className="text-muted-foreground">Brand:</span> {deal.brand.name}</div>
              <div><span className="text-muted-foreground">Asset:</span> {deal.asset.name} &rarr; {deal.page.name} &rarr; Pos {deal.position?.name ?? "\u2014"}</div>
            </div>

            <div className="grid gap-4 py-2">
              {/* Status + Geo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {DEAL_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Country</Label>
                  <Select value={geo} onValueChange={setGeo}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="inline-flex items-center gap-2">
                            <span className={`fflag fflag-${c.code} ff-sm`} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Affiliate Link */}
              <div className="grid gap-2">
                <Label>Affiliate Link</Label>
                {loadingAffiliateLinks ? (
                  <p className="text-sm text-muted-foreground">Loading affiliate links...</p>
                ) : affiliateLinks.length === 0 ? (
                  <div>
                    {deal.affiliateLink && !deal.affiliateLinkId && (
                      <p className="text-sm text-muted-foreground mb-1">
                        Legacy: <span className="font-mono text-xs">{deal.affiliateLink}</span>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">No affiliate links for this brand.</p>
                  </div>
                ) : (
                  <Select value={affiliateLinkId || "__none"} onValueChange={(val) => {
                    setAffiliateLinkId(val);
                    if (val && val !== "__none") {
                      const link = affiliateLinks.find((l) => l.affiliateLinkId === val);
                      if (link) setAffiliateLink(link.url);
                    } else {
                      setAffiliateLink("");
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an affiliate link" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No affiliate link</SelectItem>
                      {affiliateLinks.map((link) => (
                        <SelectItem key={link.affiliateLinkId} value={link.affiliateLinkId}>
                          <span className="inline-flex items-center gap-2">
                            <GeoFlag geo={link.geo} size="sm" showLabel={false} />
                            {link.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* End Date */}
              <div className="grid gap-2">
                <Label htmlFor="edit-deal-end-date">End Date</Label>
                <Input
                  id="edit-deal-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Deal Terms */}
              <div className="border-t pt-4 mt-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-deal-terms">Deal Terms</Label>
                  <Textarea
                    id="edit-deal-terms"
                    value={dealTerms}
                    onChange={(e) => setDealTerms(e.target.value)}
                    placeholder="e.g. CPA $50 USD, 30-day hold, 100/month cap, Registration + FTD"
                    rows={3}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="edit-deal-notes">Notes</Label>
                <Textarea
                  id="edit-deal-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
