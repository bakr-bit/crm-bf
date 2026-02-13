"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AssetDialog } from "@/components/dashboard/AssetDialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

// ---------- types ----------

interface Asset {
  assetId: string;
  name: string;
  assetDomain: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    positions: number;
  };
  activePositionCount: number;
}

// ---------- component ----------

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      if (!res.ok) throw new Error("Failed to fetch assets");
      const json: Asset[] = await res.json();
      setAssets(json);
    } catch (err) {
      console.error("Assets fetch error:", err);
      toast.error("Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  function handleAdd() {
    setDialogOpen(true);
  }

  function handleDialogSuccess() {
    fetchAssets();
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Assets</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 size-4" />
          Add Asset
        </Button>
      </div>

      {/* Card Grid */}
      {assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assets found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const totalPositions = asset._count.positions;
            const availablePositions =
              totalPositions - asset.activePositionCount;

            return (
              <Link
                key={asset.assetId}
                href={`/dashboard/assets/${asset.assetId}`}
              >
                <Card className="relative hover:bg-muted/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base">{asset.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {asset.assetDomain ?? "No domain"}
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span>
                        <span className="font-semibold">{totalPositions}</span>{" "}
                        positions
                      </span>
                      <span>
                        <span className="font-semibold">
                          {availablePositions}
                        </span>{" "}
                        available
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Asset Dialog */}
      <AssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
