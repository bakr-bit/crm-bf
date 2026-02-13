"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AssetDialog } from "@/components/dashboard/AssetDialog";
import { PositionDialog } from "@/components/dashboard/PositionDialog";
import { ArrowLeft, Pencil, Plus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";
import type { DealStatusType } from "@/lib/deal-status";

// ---------- types ----------

interface DealBrand {
  brandId: string;
  name: string;
}

interface DealPartner {
  partnerId: string;
  name: string;
}

interface PositionDeal {
  dealId: string;
  partnerId: string;
  partner: DealPartner;
  brandId: string;
  brand: DealBrand;
  status: string;
  startDate: string;
  endDate: string | null;
}

interface Position {
  positionId: string;
  assetId: string;
  name: string;
  path: string | null;
  details: string | null;
  createdAt: string;
  updatedAt: string;
  deals: PositionDeal[];
}

interface AssetDetail {
  assetId: string;
  name: string;
  assetDomain: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  positions: Position[];
}

// ---------- component ----------

export default function AssetDetailPage() {
  const params = useParams<{ assetId: string }>();
  const assetId = params.assetId;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | undefined>(
    undefined
  );

  const fetchAsset = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}`);
      if (!res.ok) throw new Error("Failed to fetch asset");
      const json: AssetDetail = await res.json();
      setAsset(json);
    } catch (err) {
      console.error("Asset detail fetch error:", err);
      toast.error("Failed to load asset.");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  // Delete (archive) a position
  async function handleDeletePosition(positionId: string) {
    try {
      const res = await fetch(`/api/assets/${assetId}/positions/${positionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete position.");
      }
      toast.success("Position deleted.");
      fetchAsset();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
  }

  // End a deal
  async function handleEndDeal(dealId: string) {
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Inactive" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to end deal.");
      }
      toast.success("Deal ended.");
      fetchAsset();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
  }

  // Map asset to AssetDialog expected shape
  function toAssetDialogShape(a: AssetDetail) {
    return {
      id: a.assetId,
      name: a.name,
      assetDomain: a.assetDomain ?? undefined,
      description: a.description ?? undefined,
    };
  }

  // Map position to PositionDialog expected shape
  function toPositionDialogShape(p: Position) {
    return {
      id: p.positionId,
      name: p.name,
      path: p.path ?? undefined,
      details: p.details ?? undefined,
    };
  }

  // Determine the active deal for a position (the API filters for occupying statuses)
  function getActiveDeal(position: Position): PositionDeal | undefined {
    return position.deals.find((d) =>
      OCCUPYING_STATUSES.includes(d.status as DealStatusType)
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-12 w-64 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Asset not found.</p>
        <Link
          href="/dashboard/assets"
          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Assets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back link */}
      <Link
        href="/dashboard/assets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Assets
      </Link>

      {/* Asset Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{asset.name}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAssetDialogOpen(true)}
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Domain
              </dt>
              <dd className="text-sm">{asset.assetDomain ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Description
              </dt>
              <dd className="text-sm">{asset.description ?? "Not set"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Positions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Positions</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditingPosition(undefined);
              setPositionDialogOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Add Position
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asset.positions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No positions yet.
                  </TableCell>
                </TableRow>
              ) : (
                asset.positions.map((position) => {
                  const activeDeal = getActiveDeal(position);
                  const isOccupied = Boolean(activeDeal);

                  return (
                    <TableRow key={position.positionId}>
                      <TableCell className="font-medium">
                        {position.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {position.path ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {position.details ?? "-"}
                      </TableCell>
                      <TableCell>
                        {isOccupied ? (
                          <span className="text-sm">
                            <StatusBadge status="Active" variant="deal" />
                            <span className="ml-2 text-muted-foreground">
                              {activeDeal!.brand.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-green-600">
                            Available
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingPosition(position);
                                setPositionDialogOpen(true);
                              }}
                            >
                              Edit Position
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                handleDeletePosition(position.positionId)
                              }
                            >
                              Delete Position
                            </DropdownMenuItem>

                            {isOccupied ? (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/dashboard/deals?dealId=${activeDeal!.dealId}`}
                                  >
                                    View Deal
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    handleEndDeal(activeDeal!.dealId)
                                  }
                                >
                                  End Deal
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/dashboard/deals?replace=${activeDeal!.dealId}`}
                                  >
                                    Replace Deal
                                  </Link>
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/deals?assetId=${assetId}&positionId=${position.positionId}`}
                                >
                                  Create Deal
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogs */}
      <AssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        asset={asset ? toAssetDialogShape(asset) : undefined}
        onSuccess={fetchAsset}
      />

      <PositionDialog
        open={positionDialogOpen}
        onOpenChange={setPositionDialogOpen}
        assetId={assetId}
        position={
          editingPosition ? toPositionDialogShape(editingPosition) : undefined
        }
        onSuccess={fetchAsset}
      />
    </div>
  );
}
