"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ScanItem {
  itemId: string;
  type: string;
  foundUrl: string | null;
  matchedBrandId: string | null;
  matchedBrand?: {
    brandId: string;
    partnerId: string;
    name: string;
    partner: { partnerId: string; name: string };
  } | null;
}

interface Partner {
  partnerId: string;
  name: string;
  brands: { brandId: string; name: string }[];
}

interface Position {
  positionId: string;
  name: string;
}

interface ScanItemActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ScanItem | null;
  assetId: string;
  onSuccess: () => void;
}

export function ScanItemActionDialog({
  open,
  onOpenChange,
  item,
  assetId,
  onSuccess,
}: ScanItemActionDialogProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Fetch partners with brands
      fetch("/api/partners")
        .then((r) => r.json())
        .then(async (partnerList: { partnerId: string; name: string }[]) => {
          // Fetch brands for each partner
          const enriched = await Promise.all(
            partnerList
              .filter((p: { partnerId: string; name: string; status?: string }) => (p as { status?: string }).status !== "Archived")
              .map(async (p: { partnerId: string; name: string }) => {
                const res = await fetch(`/api/partners/${p.partnerId}`);
                const detail = await res.json();
                return {
                  partnerId: p.partnerId,
                  name: p.name,
                  brands: detail.brands ?? [],
                };
              })
          );
          setPartners(enriched);
        })
        .catch(() => {});

      // Fetch positions for the asset
      fetch(`/api/assets/${assetId}/positions`)
        .then((r) => r.json())
        .then((pos: Position[]) => setPositions(pos))
        .catch(() => {});

      // Pre-fill if brand detected
      if (item?.matchedBrand) {
        setSelectedPartner(item.matchedBrand.partnerId);
        setSelectedBrand(item.matchedBrand.brandId);
      } else {
        setSelectedPartner("");
        setSelectedBrand("");
      }
      setSelectedPosition("");
    }
  }, [open, item, assetId]);

  const currentPartner = partners.find(
    (p) => p.partnerId === selectedPartner
  );

  async function handleSubmit() {
    if (!selectedPartner || !selectedBrand || !selectedPosition) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/deal-finder/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item!.itemId,
          action: "Confirmed",
          partnerId: selectedPartner,
          brandId: selectedBrand,
          positionId: selectedPosition,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create deal");
      }

      toast.success("Deal created from scan result");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Deal from Found Link</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Found URL (read-only) */}
          <div className="grid gap-2">
            <Label>Affiliate Link</Label>
            <div className="rounded-md border bg-zinc-50 px-3 py-2 text-sm text-zinc-600 break-all">
              {item?.foundUrl ?? "—"}
            </div>
          </div>

          {/* Partner */}
          <div className="grid gap-2">
            <Label>Partner *</Label>
            <Select
              value={selectedPartner}
              onValueChange={(val) => {
                setSelectedPartner(val);
                setSelectedBrand("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select partner" />
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
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {(currentPartner?.brands ?? []).map(
                  (b: { brandId: string; name: string }) => (
                    <SelectItem key={b.brandId} value={b.brandId}>
                      {b.name}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="grid gap-2">
            <Label>Position *</Label>
            <Select
              value={selectedPosition}
              onValueChange={setSelectedPosition}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.positionId} value={p.positionId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
