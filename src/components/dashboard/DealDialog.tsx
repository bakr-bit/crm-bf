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
import { COUNTRIES } from "@/lib/countries";

// ---------- types ----------

interface Partner {
  partnerId: string;
  name: string;
  isDirect: boolean;
  hasContract: boolean;
  hasLicense: boolean;
  hasBanking: boolean;
}

interface Brand {
  brandId: string;
  name: string;
}

interface Asset {
  assetId: string;
  name: string;
}

interface Page {
  pageId: string;
  name: string;
}

interface Position {
  positionId: string;
  name: string;
  activeDealId: string | null;
}

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefill?: {
    partnerId?: string;
    brandId?: string;
    assetId?: string;
    pageId?: string;
    positionId?: string;
  };
}

// ---------- helpers ----------

function isSopIncomplete(partner: Partner): boolean {
  return partner.isDirect && (!partner.hasContract || !partner.hasLicense || !partner.hasBanking);
}

// ---------- component ----------

export function DealDialog({
  open,
  onOpenChange,
  onSuccess,
  prefill,
}: DealDialogProps) {
  // Partner / Brand cascading state
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Asset / Page / Position cascading state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState("");
  const [pages, setPages] = useState<Page[]>([]);
  const [pageId, setPageId] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionId, setPositionId] = useState("");
  const [loadingPositions, setLoadingPositions] = useState(false);

  // Geo
  const [geo, setGeo] = useState("");

  // Status override for N/A positions
  const [forceInactive, setForceInactive] = useState(false);

  // Other fields
  const [affiliateLink, setAffiliateLink] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endDateNA, setEndDateNA] = useState(false);
  const [notes, setNotes] = useState("");

  // Financial fields
  const [payoutModel, setPayoutModel] = useState("");
  const [payoutValue, setPayoutValue] = useState("");
  const [currency, setCurrency] = useState("");
  const [baseline, setBaseline] = useState("");
  const [conversionFlow, setConversionFlow] = useState("");
  const [cap, setCap] = useState("");
  const [holdPeriod, setHoldPeriod] = useState("");
  const [hasLocalLicense, setHasLocalLicense] = useState(false);

  const [loading, setLoading] = useState(false);

  const isAssetPrefilled = Boolean(prefill?.assetId);
  const isPartnerPrefilled = Boolean(prefill?.partnerId);

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

  // ---------- fetch assets on mount ----------
  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      if (!res.ok) throw new Error("Failed to fetch assets");
      const json: Asset[] = await res.json();
      setAssets(json);
    } catch {
      console.error("Failed to load assets");
    }
  }, []);

  // Initial data load
  useEffect(() => {
    if (open) {
      fetchPartners();
      fetchAssets();
    }
  }, [open, fetchPartners, fetchAssets]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setPartnerId(prefill?.partnerId ?? "");
      setBrandId(prefill?.brandId ?? "");
      setBrands([]);
      setGeo("");
      setAssetId(prefill?.assetId ?? "");
      setPageId(prefill?.pageId ?? "");
      setPositionId(prefill?.positionId ?? "");
      setPages([]);
      setPositions([]);
      setAffiliateLink("");
      setStartDate("");
      setEndDate("");
      setEndDateNA(false);
      setNotes("");
      setPayoutModel("");
      setPayoutValue("");
      setCurrency("");
      setBaseline("");
      setConversionFlow("");
      setCap("");
      setHoldPeriod("");
      setHasLocalLicense(false);
    }
  }, [open, prefill]);

  // ---------- fetch brands when partner changes ----------
  useEffect(() => {
    if (!partnerId) {
      setBrands([]);
      setBrandId("");
      return;
    }

    let cancelled = false;
    setLoadingBrands(true);
    if (!prefill?.brandId) {
      setBrandId("");
    }

    (async () => {
      try {
        const res = await fetch(`/api/partners/${partnerId}/brands`);
        if (!res.ok) throw new Error("Failed to fetch brands");
        const json: Brand[] = await res.json();
        if (!cancelled) {
          setBrands(json);
          // Restore prefilled brand after brands load
          if (prefill?.brandId && json.some((b) => b.brandId === prefill.brandId)) {
            setBrandId(prefill.brandId);
          }
        }
      } catch {
        if (!cancelled) setBrands([]);
      } finally {
        if (!cancelled) setLoadingBrands(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [partnerId, prefill?.brandId]);

  // ---------- fetch pages when asset changes ----------
  useEffect(() => {
    if (!assetId) {
      setPages([]);
      setPageId(prefill?.pageId ?? "");
      setPositions([]);
      setPositionId(prefill?.positionId ?? "");
      return;
    }

    let cancelled = false;
    setLoadingPages(true);
    if (!prefill?.pageId) {
      setPageId("");
    }
    setPositions([]);
    if (!prefill?.positionId) {
      setPositionId("");
    }

    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}/pages`);
        if (!res.ok) throw new Error("Failed to fetch pages");
        const json: Page[] = await res.json();
        if (!cancelled) setPages(json);
      } catch {
        if (!cancelled) setPages([]);
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId, prefill?.pageId, prefill?.positionId]);

  // ---------- fetch positions when page changes ----------
  useEffect(() => {
    if (!assetId || !pageId) {
      setPositions([]);
      if (!prefill?.positionId) {
        setPositionId("");
      }
      return;
    }

    let cancelled = false;
    setLoadingPositions(true);
    if (!prefill?.positionId) {
      setPositionId("");
    }

    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}/pages/${pageId}/positions`);
        if (!res.ok) throw new Error("Failed to fetch positions");
        const json: Position[] = await res.json();
        if (!cancelled) setPositions(json);
      } catch {
        if (!cancelled) setPositions([]);
      } finally {
        if (!cancelled) setLoadingPositions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId, pageId, prefill?.positionId]);

  // ---------- prefill: auto-load for prefilled asset ----------
  useEffect(() => {
    if (open && prefill?.assetId) {
      setAssetId(prefill.assetId);
    }
  }, [open, prefill?.assetId]);

  // ---------- N/A position detection ----------
  const selectedPosition = positions.find((p) => p.positionId === positionId);
  const isNAPosition = selectedPosition?.name === "N/A";

  useEffect(() => {
    setForceInactive(isNAPosition);
  }, [isNAPosition]);

  // ---------- SOP warning ----------
  const selectedPartner = partners.find((p) => p.partnerId === partnerId);
  const showSopWarning = selectedPartner ? isSopIncomplete(selectedPartner) : false;

  // ---------- submit ----------
  async function handleSubmit() {
    if (!partnerId) {
      toast.error("Please select a partner.");
      return;
    }
    if (!brandId) {
      toast.error("Please select a brand.");
      return;
    }
    if (!geo) {
      toast.error("Please select a country.");
      return;
    }
    if (!assetId) {
      toast.error("Please select an asset.");
      return;
    }
    if (!pageId) {
      toast.error("Please select a page.");
      return;
    }
    if (!positionId) {
      toast.error("Please select a position.");
      return;
    }
    if (!startDate) {
      toast.error("Please enter a start date.");
      return;
    }

    setLoading(true);

    const body = {
      partnerId,
      brandId,
      geo,
      assetId,
      pageId,
      positionId,
      affiliateLink: affiliateLink.trim() || undefined,
      startDate,
      endDate: endDate || undefined,
      notes: notes.trim() || undefined,
      payoutModel: payoutModel.trim() || undefined,
      payoutValue: payoutValue.trim() || undefined,
      currency: currency.trim() || undefined,
      baseline: baseline.trim() || undefined,
      conversionFlow: conversionFlow.trim() || undefined,
      cap: cap.trim() || undefined,
      holdPeriod: holdPeriod.trim() || undefined,
      hasLocalLicense,
      forceInactive,
    };

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create deal.");
      }

      toast.success("Deal created.");
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Deal</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* SOP Warning */}
          {showSopWarning && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              This partner has incomplete SOP. Deal will be set to Approved
              status (pending full implementation).
            </div>
          )}

          {/* N/A Position Info */}
          {forceInactive && (
            <div className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800">
              N/A position selected — this deal will be created with Inactive status.
            </div>
          )}

          {/* Partner */}
          <div className="grid gap-2">
            <Label>Partner *</Label>
            <Select value={partnerId} onValueChange={setPartnerId} disabled={isPartnerPrefilled}>
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
            <Label>Brand *</Label>
            <Select
              value={brandId}
              onValueChange={setBrandId}
              disabled={!partnerId || loadingBrands || (isPartnerPrefilled && Boolean(prefill?.brandId))}
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

          {/* Country (Geo) */}
          <div className="grid gap-2">
            <Label>Country *</Label>
            <Select value={geo} onValueChange={setGeo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a country" />
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

          {/* Asset */}
          <div className="grid gap-2">
            <Label>Asset *</Label>
            <Select
              value={assetId}
              onValueChange={setAssetId}
              disabled={isAssetPrefilled}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.assetId} value={a.assetId}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page */}
          <div className="grid gap-2">
            <Label>Page *</Label>
            <Select
              value={pageId}
              onValueChange={setPageId}
              disabled={!assetId || loadingPages || (isAssetPrefilled && Boolean(prefill?.pageId))}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !assetId
                      ? "Select an asset first"
                      : loadingPages
                        ? "Loading pages..."
                        : "Select a page"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {pages.map((p) => (
                  <SelectItem key={p.pageId} value={p.pageId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="grid gap-2">
            <Label>Position *</Label>
            <Select
              value={positionId}
              onValueChange={setPositionId}
              disabled={!pageId || loadingPositions || (isAssetPrefilled && Boolean(prefill?.positionId))}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !pageId
                      ? "Select a page first"
                      : loadingPositions
                        ? "Loading positions..."
                        : "Select a position"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.positionId} value={p.positionId}>
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          p.activeDealId ? "bg-red-500" : "bg-green-500"
                        }`}
                      />
                      {p.name}
                      {p.activeDealId && (
                        <span className="text-xs text-muted-foreground">
                          (occupied)
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Affiliate Link */}
          <div className="grid gap-2">
            <Label htmlFor="deal-affiliate-link">Affiliate Link</Label>
            <Input
              id="deal-affiliate-link"
              value={affiliateLink}
              onChange={(e) => setAffiliateLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="deal-start-date">Start Date *</Label>
              <Input
                id="deal-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deal-end-date">End Date</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="deal-end-date"
                  type="date"
                  value={endDateNA ? "" : endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={endDateNA}
                  className={endDateNA ? "opacity-50" : ""}
                />
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    checked={endDateNA}
                    onChange={(e) => {
                      setEndDateNA(e.target.checked);
                      if (e.target.checked) setEndDate("");
                    }}
                    className="rounded border-input"
                  />
                  N/A
                </label>
              </div>
            </div>
          </div>

          {/* Deal Terms Section */}
          <div className="border-t pt-4 mt-2">
            <h3 className="text-sm font-semibold mb-3">Deal Terms</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="deal-payout-model">Payout Model</Label>
                  <Select value={payoutModel} onValueChange={setPayoutModel}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPA">CPA</SelectItem>
                      <SelectItem value="RevShare">RevShare</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Flat Fee">Flat Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deal-payout-value">Payout Value</Label>
                  <Input
                    id="deal-payout-value"
                    value={payoutValue}
                    onChange={(e) => setPayoutValue(e.target.value)}
                    placeholder="e.g. $50 or 30%"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="deal-currency">Currency</Label>
                  <Input
                    id="deal-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="e.g. USD, EUR"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deal-baseline">Baseline</Label>
                  <Input
                    id="deal-baseline"
                    value={baseline}
                    onChange={(e) => setBaseline(e.target.value)}
                    placeholder="e.g. $20 min deposit"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deal-conversion-flow">Conversion Flow</Label>
                <Input
                  id="deal-conversion-flow"
                  value={conversionFlow}
                  onChange={(e) => setConversionFlow(e.target.value)}
                  placeholder="e.g. Registration + FTD"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="deal-cap">Cap</Label>
                  <Input
                    id="deal-cap"
                    value={cap}
                    onChange={(e) => setCap(e.target.value)}
                    placeholder="e.g. 100/month"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deal-hold-period">Hold Period</Label>
                  <Input
                    id="deal-hold-period"
                    value={holdPeriod}
                    onChange={(e) => setHoldPeriod(e.target.value)}
                    placeholder="e.g. 30 days"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deal-local-license"
                  checked={hasLocalLicense}
                  onChange={(e) => setHasLocalLicense(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="deal-local-license">Has Local License</Label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="deal-notes">Notes</Label>
            <Textarea
              id="deal-notes"
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
            {loading ? "Creating..." : "Create Deal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
