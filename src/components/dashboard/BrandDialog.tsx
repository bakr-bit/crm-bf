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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { GeoFlag } from "@/components/dashboard/GeoFlag";
import { COUNTRY_MAP } from "@/lib/countries";
import { GeoMultiSelect } from "./GeoMultiSelect";
import { LicenseMultiSelect } from "./LicenseMultiSelect";

interface Brand {
  id: string;
  name: string;
  brandDomain?: string;
  licenses?: string[];
  extraInfo?: string;
  affiliateSoftware?: string;
  status?: string;
  targetGeos?: string[];
}

interface AffiliateLinkDraft {
  label: string;
  url: string;
  geo: string;
}

interface AffiliateLinkExisting extends AffiliateLinkDraft {
  affiliateLinkId: string;
}

interface BrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  brand?: Brand;
  onSuccess: () => void;
}

const COUNTRIES_LIST = [
  { code: "__global", name: "Global" },
  ...Object.entries(COUNTRY_MAP).map(([code, name]) => ({ code, name })),
];

export function BrandDialog({
  open,
  onOpenChange,
  partnerId,
  brand,
  onSuccess,
}: BrandDialogProps) {
  const isEdit = Boolean(brand);

  const [name, setName] = useState("");
  const [brandDomain, setBrandDomain] = useState("");
  const [licenses, setLicenses] = useState<string[]>([]);
  const [extraInfo, setExtraInfo] = useState("");
  const [affiliateSoftware, setAffiliateSoftware] = useState("");
  const [status, setStatus] = useState("Active");
  const [targetGeos, setTargetGeos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Affiliate links
  const [existingLinks, setExistingLinks] = useState<AffiliateLinkExisting[]>([]);
  const [removedLinkIds, setRemovedLinkIds] = useState<string[]>([]);
  const [newLinks, setNewLinks] = useState<AffiliateLinkDraft[]>([]);

  useEffect(() => {
    if (brand) {
      setName(brand.name ?? "");
      setBrandDomain(brand.brandDomain ?? "");
      setLicenses(brand.licenses ?? []);
      setExtraInfo(brand.extraInfo ?? "");
      setAffiliateSoftware(brand.affiliateSoftware ?? "");
      setStatus(brand.status ?? "Active");
      setTargetGeos(brand.targetGeos ?? []);
      // Fetch existing affiliate links
      fetchAffiliateLinks(brand.id);
    } else {
      setName("");
      setBrandDomain("");
      setLicenses([]);
      setExtraInfo("");
      setAffiliateSoftware("");
      setStatus("Active");
      setTargetGeos([]);
      setExistingLinks([]);
    }
    setRemovedLinkIds([]);
    setNewLinks([]);
  }, [brand, open]);

  async function fetchAffiliateLinks(brandId: string) {
    try {
      const res = await fetch(`/api/brands/${brandId}/affiliate-links`);
      if (!res.ok) return;
      const json: AffiliateLinkExisting[] = await res.json();
      setExistingLinks(json);
    } catch {
      setExistingLinks([]);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Brand name is required.");
      return;
    }

    setLoading(true);

    const body = {
      name: name.trim(),
      brandDomain: brandDomain.trim() || undefined,
      licenses,
      extraInfo: extraInfo.trim() || undefined,
      affiliateSoftware: affiliateSoftware.trim() || undefined,
      status,
      targetGeos,
    };

    try {
      const url = isEdit
        ? `/api/brands/${brand!.id}`
        : `/api/partners/${partnerId}/brands`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save brand.");
      }

      const savedBrand = await res.json();
      const brandId = isEdit ? brand!.id : savedBrand.brandId;

      // Delete removed affiliate links
      for (const linkId of removedLinkIds) {
        await fetch(`/api/brands/${brandId}/affiliate-links/${linkId}`, {
          method: "DELETE",
        });
      }

      // Create new affiliate links
      const validNewLinks = newLinks.filter((l) => l.label.trim() && l.url.trim());
      for (const link of validNewLinks) {
        await fetch(`/api/brands/${brandId}/affiliate-links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: link.label.trim(),
            url: link.url.trim(),
            geo: link.geo,
          }),
        });
      }

      toast.success(isEdit ? "Brand updated." : "Brand created.");
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

  const visibleExisting = existingLinks.filter(
    (l) => !removedLinkIds.includes(l.affiliateLinkId)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Brand" : "Create Brand"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="brand-name">Name *</Label>
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Brand name"
            />
          </div>

          {/* Brand Domain */}
          <div className="grid gap-2">
            <Label htmlFor="brand-domain">Brand Domain</Label>
            <Input
              id="brand-domain"
              value={brandDomain}
              onChange={(e) => setBrandDomain(e.target.value)}
              placeholder="brand.com"
            />
          </div>

          {/* Target Geos */}
          <div className="grid gap-2">
            <Label>Target Geos</Label>
            <GeoMultiSelect value={targetGeos} onChange={setTargetGeos} />
          </div>

          {/* Licenses */}
          <div className="grid gap-2">
            <Label>Licenses</Label>
            <LicenseMultiSelect value={licenses} onChange={setLicenses} />
          </div>

          {/* Affiliate Software */}
          <div className="grid gap-2">
            <Label htmlFor="brand-affiliate-software">Affiliate Software</Label>
            <Input
              id="brand-affiliate-software"
              value={affiliateSoftware}
              onChange={(e) => setAffiliateSoftware(e.target.value)}
              placeholder="e.g. Income Access, NetRefer"
            />
          </div>

          {/* Extra Info */}
          <div className="grid gap-2">
            <Label htmlFor="brand-extra-info">Extra Info</Label>
            <Input
              id="brand-extra-info"
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder="Any additional notes"
            />
          </div>

          {/* Affiliate Links */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Affiliate Links</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setNewLinks([...newLinks, { label: "", url: "", geo: "__global" }])
                }
              >
                <Plus className="mr-1 size-3" />
                Add
              </Button>
            </div>

            {visibleExisting.length === 0 && newLinks.length === 0 && (
              <p className="text-sm text-muted-foreground">No affiliate links.</p>
            )}

            {/* Existing links */}
            {visibleExisting.map((link) => (
              <div
                key={link.affiliateLinkId}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <GeoFlag geo={link.geo} size="sm" />
                <span className="font-medium truncate">{link.label}</span>
                <span className="text-muted-foreground text-xs truncate flex-1">
                  {link.url}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setRemovedLinkIds([...removedLinkIds, link.affiliateLinkId])
                  }
                >
                  <Trash2 className="size-3 text-muted-foreground" />
                </Button>
              </div>
            ))}

            {/* New link drafts */}
            {newLinks.map((link, i) => (
              <div key={`new-${i}`} className="space-y-2 rounded-md border p-3">
                <Input
                  value={link.label}
                  onChange={(e) => {
                    const updated = [...newLinks];
                    updated[i] = { ...updated[i], label: e.target.value };
                    setNewLinks(updated);
                  }}
                  placeholder="Label"
                />
                <Input
                  value={link.url}
                  onChange={(e) => {
                    const updated = [...newLinks];
                    updated[i] = { ...updated[i], url: e.target.value };
                    setNewLinks(updated);
                  }}
                  placeholder="URL"
                />
                <div className="flex items-center gap-2">
                  <Select
                    value={link.geo}
                    onValueChange={(val) => {
                      const updated = [...newLinks];
                      updated[i] = { ...updated[i], geo: val };
                      setNewLinks(updated);
                    }}
                  >
                    <SelectTrigger className="flex-1">
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
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setNewLinks(newLinks.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
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
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
