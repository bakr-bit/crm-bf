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
import { toast } from "sonner";

interface Asset {
  id: string;
  name: string;
  assetDomain?: string;
  description?: string;
}

interface AssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset;
  onSuccess: () => void;
}

export function AssetDialog({
  open,
  onOpenChange,
  asset,
  onSuccess,
}: AssetDialogProps) {
  const isEdit = Boolean(asset);

  const [name, setName] = useState("");
  const [assetDomain, setAssetDomain] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (asset) {
      setName(asset.name ?? "");
      setAssetDomain(asset.assetDomain ?? "");
      setDescription(asset.description ?? "");
    } else {
      setName("");
      setAssetDomain("");
      setDescription("");
    }
  }, [asset, open]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Asset name is required.");
      return;
    }

    setLoading(true);

    const body = {
      name: name.trim(),
      assetDomain: assetDomain.trim() || undefined,
      description: description.trim() || undefined,
    };

    try {
      const url = isEdit
        ? `/api/assets/${asset!.id}`
        : "/api/assets";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save asset.");
      }

      toast.success(isEdit ? "Asset updated." : "Asset created.");
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
          <DialogTitle>{isEdit ? "Edit Asset" : "Create Asset"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="asset-name">Name *</Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Asset name"
            />
          </div>

          {/* Asset Domain */}
          <div className="grid gap-2">
            <Label htmlFor="asset-domain">Asset Domain</Label>
            <Input
              id="asset-domain"
              value={assetDomain}
              onChange={(e) => setAssetDomain(e.target.value)}
              placeholder="asset.example.com"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="asset-description">Description</Label>
            <Textarea
              id="asset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this asset..."
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
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
