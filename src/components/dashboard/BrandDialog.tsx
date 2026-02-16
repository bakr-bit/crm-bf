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
import { GeoMultiSelect } from "./GeoMultiSelect";

interface Brand {
  id: string;
  name: string;
  brandDomain?: string;
  postbacks?: string;
  licenseInfo?: string;
  extraInfo?: string;
  affiliateSoftware?: string;
  status?: string;
  targetGeos?: string[];
}

interface BrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  brand?: Brand;
  onSuccess: () => void;
}

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
  const [postbacks, setPostbacks] = useState("");
  const [licenseInfo, setLicenseInfo] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [affiliateSoftware, setAffiliateSoftware] = useState("");
  const [status, setStatus] = useState("Active");
  const [targetGeos, setTargetGeos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (brand) {
      setName(brand.name ?? "");
      setBrandDomain(brand.brandDomain ?? "");
      setPostbacks(brand.postbacks ?? "");
      setLicenseInfo(brand.licenseInfo ?? "");
      setExtraInfo(brand.extraInfo ?? "");
      setAffiliateSoftware(brand.affiliateSoftware ?? "");
      setStatus(brand.status ?? "Active");
      setTargetGeos(brand.targetGeos ?? []);
    } else {
      setName("");
      setBrandDomain("");
      setPostbacks("");
      setLicenseInfo("");
      setExtraInfo("");
      setAffiliateSoftware("");
      setStatus("Active");
      setTargetGeos([]);
    }
  }, [brand, open]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Brand name is required.");
      return;
    }

    setLoading(true);

    const body = {
      name: name.trim(),
      brandDomain: brandDomain.trim() || undefined,
      postbacks: postbacks.trim() || undefined,
      licenseInfo: licenseInfo.trim() || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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

          {/* Postbacks */}
          <div className="grid gap-2">
            <Label htmlFor="brand-postbacks">Postbacks</Label>
            <Input
              id="brand-postbacks"
              value={postbacks}
              onChange={(e) => setPostbacks(e.target.value)}
              placeholder="Postback URL or details"
            />
          </div>

          {/* License Info */}
          <div className="grid gap-2">
            <Label htmlFor="brand-license-info">License Info</Label>
            <Input
              id="brand-license-info"
              value={licenseInfo}
              onChange={(e) => setLicenseInfo(e.target.value)}
              placeholder="e.g. MGA, Curacao, UKGC"
            />
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
