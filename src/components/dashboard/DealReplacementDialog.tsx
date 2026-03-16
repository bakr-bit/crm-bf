"use client";

import { useState, useEffect, useCallback } from "react";
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

// ---------- types ----------

interface Partner {
  partnerId: string;
  name: string;
}

interface Brand {
  brandId: string;
  name: string;
}

interface AffiliateLinkOption {
  affiliateLinkId: string;
  label: string;
  url: string;
  geo: string;
}

interface DealInfo {
  dealId: string;
  assetId: string;
  positionId: string | null;
  assetName: string;
  positionName: string;
}

interface DealReplacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: DealInfo | null;
  onSuccess: () => void;
}

// ---------- component ----------

export function DealReplacementDialog({
  open,
  onOpenChange,
  deal,
  onSuccess,
}: DealReplacementDialogProps) {
  // Partner / Brand cascading state
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Affiliate links
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinkOption[]>([]);
  const [affiliateLinkId, setAffiliateLinkId] = useState("");
  const [loadingAffiliateLinks, setLoadingAffiliateLinks] = useState(false);

  // Other fields
  const [replacementReason, setReplacementReason] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);

  // ---------- fetch partners on mount ----------
  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch("/api/partners");
      if (!res.ok) throw new Error("Failed to fetch partners");
      const json: Partner[] = await res.json();
      setPartners(json);
    } catch {
      console.error("Failed to load partners");
    }
  }, []);

  // Initial data load and reset form
  useEffect(() => {
    if (open) {
      fetchPartners();
      setPartnerId("");
      setBrandId("");
      setBrands([]);
      setReplacementReason("");
      setAffiliateLink("");
      setAffiliateLinkId("");
      setAffiliateLinks([]);
      setNotes("");
    }
  }, [open, fetchPartners]);

  // ---------- fetch brands when partner changes ----------
  useEffect(() => {
    if (!partnerId) {
      setBrands([]);
      setBrandId("");
      return;
    }

    let cancelled = false;
    setLoadingBrands(true);
    setBrandId("");

    (async () => {
      try {
        const res = await fetch(`/api/partners/${partnerId}/brands`);
        if (!res.ok) throw new Error("Failed to fetch brands");
        const json: Brand[] = await res.json();
        if (!cancelled) setBrands(json);
      } catch {
        if (!cancelled) setBrands([]);
      } finally {
        if (!cancelled) setLoadingBrands(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  // ---------- fetch affiliate links when brand changes ----------
  useEffect(() => {
    if (!brandId) {
      setAffiliateLinks([]);
      setAffiliateLinkId("");
      return;
    }

    let cancelled = false;
    setLoadingAffiliateLinks(true);
    setAffiliateLinkId("");

    (async () => {
      try {
        const res = await fetch(`/api/brands/${brandId}/affiliate-links`);
        if (!res.ok) throw new Error("Failed to fetch affiliate links");
        const json: AffiliateLinkOption[] = await res.json();
        if (!cancelled) setAffiliateLinks(json);
      } catch {
        if (!cancelled) setAffiliateLinks([]);
      } finally {
        if (!cancelled) setLoadingAffiliateLinks(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [brandId]);

  // ---------- submit ----------
  async function handleSubmit() {
    if (!deal) return;

    if (!partnerId) {
      toast.error("Please select a partner.");
      return;
    }
    if (!brandId) {
      toast.error("Please select a brand.");
      return;
    }
    if (!replacementReason.trim()) {
      toast.error("Please enter a reason for replacement.");
      return;
    }

    setLoading(true);

    const body = {
      existingDealId: deal.dealId,
      partnerId,
      brandId,
      replacementReason: replacementReason.trim(),
      affiliateLink: affiliateLink.trim() || undefined,
      affiliateLinkId: affiliateLinkId && affiliateLinkId !== "__none" ? affiliateLinkId : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/deals/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to replace deal.");
      }

      toast.success("Deal replaced successfully.");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Replace Deal</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Locked Asset / Position Info */}
          {deal && (
            <div className="rounded-md border bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">Current Position</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Asset:</span>{" "}
                {deal.assetName}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Position:</span>{" "}
                {deal.positionName}
              </p>
            </div>
          )}

          {/* Partner */}
          <div className="grid gap-2">
            <Label>New Partner *</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.partnerId} value={p.partnerId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand */}
          <div className="grid gap-2">
            <Label>New Brand *</Label>
            <Select
              value={brandId}
              onValueChange={setBrandId}
              disabled={!partnerId || loadingBrands}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !partnerId
                      ? "Select a partner first"
                      : loadingBrands
                        ? "Loading brands..."
                        : "Select a brand"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.brandId} value={b.brandId}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Affiliate Link */}
          <div className="grid gap-2">
            <Label>Affiliate Link</Label>
            {!brandId ? (
              <p className="text-sm text-muted-foreground">Select a brand first</p>
            ) : loadingAffiliateLinks ? (
              <p className="text-sm text-muted-foreground">Loading affiliate links...</p>
            ) : affiliateLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No affiliate links for this brand.</p>
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

          {/* Replacement Reason (required) */}
          <div className="grid gap-2">
            <Label htmlFor="replace-reason">Reason for Replacement *</Label>
            <Textarea
              id="replace-reason"
              value={replacementReason}
              onChange={(e) => setReplacementReason(e.target.value)}
              placeholder="Why is this deal being replaced?"
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="replace-notes">Notes</Label>
            <Textarea
              id="replace-notes"
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
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Replacing..." : "Replace Deal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
