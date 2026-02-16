"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { PageDialog } from "@/components/dashboard/PageDialog";
import { PositionDialog } from "@/components/dashboard/PositionDialog";
import { ArrowLeft, Pencil, Plus, MoreHorizontal, Download, Trash2, Search } from "lucide-react";
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
  geo: string;
  status: string;
  startDate: string;
  endDate: string | null;
}

interface Position {
  positionId: string;
  pageId: string;
  name: string;
  details: string | null;
  createdAt: string;
  updatedAt: string;
  deals: PositionDeal[];
}

interface Page {
  pageId: string;
  assetId: string;
  name: string;
  path: string | null;
  description: string | null;
  positions: Position[];
}

interface AssetDetail {
  assetId: string;
  name: string;
  assetDomain: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  pages: Page[];
}

// ---------- component ----------

export default function AssetDetailPage() {
  const params = useParams<{ assetId: string }>();
  const assetId = params.assetId;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | undefined>(undefined);
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | undefined>(
    undefined
  );
  const [activePageId, setActivePageId] = useState<string>("");
  const [pageSearch, setPageSearch] = useState("");

  const fetchAsset = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}`);
      if (!res.ok) throw new Error("Failed to fetch asset");
      const json: AssetDetail = await res.json();
      // Defensive: ensure pages array exists
      if (!json.pages) json.pages = [];
      setAsset(json);
      // Set active tab to first page if not already set
      setActivePageId((prev) => {
        if (!prev && json.pages.length > 0) return json.pages[0].pageId;
        return prev;
      });
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
  async function handleDeletePosition(pageId: string, positionId: string) {
    try {
      const res = await fetch(
        `/api/assets/${assetId}/pages/${pageId}/positions/${positionId}`,
        { method: "DELETE" }
      );
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

  // Delete (archive) a page
  async function handleDeletePage(pageId: string) {
    try {
      const res = await fetch(
        `/api/assets/${assetId}/pages/${pageId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete page.");
      }
      toast.success("Page archived.");
      // Switch to first remaining page
      setActivePageId("");
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

  // Map page to PageDialog expected shape
  function toPageDialogShape(p: Page) {
    return {
      id: p.pageId,
      name: p.name,
      path: p.path ?? undefined,
      description: p.description ?? undefined,
    };
  }

  // Map position to PositionDialog expected shape
  function toPositionDialogShape(p: Position) {
    return {
      id: p.positionId,
      name: p.name,
      details: p.details ?? undefined,
    };
  }

  // Determine the active deal for a position
  function getActiveDeal(position: Position): PositionDeal | undefined {
    return position.deals.find((d) =>
      OCCUPYING_STATUSES.includes(d.status as DealStatusType)
    );
  }

  function handleExportCsv() {
    if (!asset) return;

    const headers = [
      "Page",
      "Position Name",
      "Details",
      "Status",
      "Brand",
      "Partner",
      "Geo",
      "Deal Status",
    ];

    const rows = asset.pages.flatMap((page) =>
      page.positions.map((position) => {
        const activeDeal = getActiveDeal(position);
        return [
          page.name,
          position.name,
          position.details ?? "",
          activeDeal ? "Occupied" : "Available",
          activeDeal?.brand.name ?? "",
          activeDeal?.partner.name ?? "",
          activeDeal?.geo ?? "",
          activeDeal?.status ?? "",
        ];
      })
    );

    const escapeCsvField = (field: string) => {
      if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = [
      headers.map(escapeCsvField).join(","),
      ...rows.map((row) => row.map(escapeCsvField).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${asset.name.replace(/[^a-zA-Z0-9]/g, "_")}_positions.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

  const activePage = asset.pages.find((p) => p.pageId === activePageId);

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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              disabled={asset.pages.flatMap((p) => p.positions).length === 0}
            >
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssetDialogOpen(true)}
            >
              <Pencil className="mr-2 size-4" />
              Edit
            </Button>
          </div>
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

      {/* Pages Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Pages
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({asset.pages.length})
            </span>
          </h2>
          <Button
            size="sm"
            onClick={() => {
              setEditingPage(undefined);
              setPageDialogOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Add Page
          </Button>
        </div>

        {asset.pages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No pages yet. Add a page to start managing positions.
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-start gap-6">
            {/* Sidebar */}
            <div className="w-72 shrink-0 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[calc(100vh-22rem)] overflow-y-auto rounded-lg border">
                {(() => {
                  const q = pageSearch.toLowerCase();
                  const filtered = asset.pages.filter(
                    (p) =>
                      p.name.toLowerCase().includes(q) ||
                      (p.path ?? "").toLowerCase().includes(q)
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No pages match &ldquo;{pageSearch}&rdquo;
                      </div>
                    );
                  }
                  return filtered.map((page) => {
                    const isActive = page.pageId === activePageId;
                    const occupiedCount = page.positions.filter((p) =>
                      p.deals.some((d) =>
                        OCCUPYING_STATUSES.includes(d.status as DealStatusType)
                      )
                    ).length;
                    return (
                      <button
                        key={page.pageId}
                        onClick={() => setActivePageId(page.pageId)}
                        className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 transition-colors ${
                          isActive
                            ? "bg-accent"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {page.name}
                          </span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {page.positions.length} pos
                          </span>
                        </div>
                        {page.path && (
                          <div className="mt-0.5 text-xs font-mono text-muted-foreground truncate">
                            {page.path}
                          </div>
                        )}
                        {page.positions.length > 0 && (
                          <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                            <span className="text-green-600">
                              {page.positions.length - occupiedCount} open
                            </span>
                            {occupiedCount > 0 && (
                              <span>{occupiedCount} filled</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              {activePage ? (
                <>
                  {/* Page header — same height as search input row */}
                  <div className="flex items-center justify-between mb-2 min-h-9">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold leading-none">{activePage.name}</h3>
                      {activePage.path && (
                        <span className="text-sm font-mono text-muted-foreground">{activePage.path}</span>
                      )}
                      {activePage.description && (
                        <span className="text-sm text-muted-foreground">{activePage.description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPage(activePage);
                          setPageDialogOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 size-4" />
                        Edit Page
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePage(activePage.pageId)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Archive
                      </Button>
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
                  </div>

                  {/* Positions table */}
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activePage.positions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-muted-foreground"
                            >
                              No positions yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          activePage.positions.map((position) => {
                            const activeDeal = getActiveDeal(position);
                            const isOccupied = Boolean(activeDeal);

                            return (
                              <TableRow key={position.positionId}>
                                <TableCell className="font-medium">
                                  {position.name}
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
                                          handleDeletePosition(
                                            activePage.pageId,
                                            position.positionId
                                          )
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
                                            href={`/dashboard/deals?assetId=${assetId}&pageId=${activePage.pageId}&positionId=${position.positionId}`}
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
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Select a page from the sidebar
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        asset={asset ? toAssetDialogShape(asset) : undefined}
        onSuccess={fetchAsset}
      />

      <PageDialog
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        assetId={assetId}
        page={editingPage ? toPageDialogShape(editingPage) : undefined}
        onSuccess={fetchAsset}
      />

      <PositionDialog
        open={positionDialogOpen}
        onOpenChange={setPositionDialogOpen}
        assetId={assetId}
        pageId={activePageId}
        position={
          editingPosition ? toPositionDialogShape(editingPosition) : undefined
        }
        onSuccess={fetchAsset}
      />
    </div>
  );
}
