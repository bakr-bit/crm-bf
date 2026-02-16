"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
import { ArrowLeft, Pencil, Plus, MoreHorizontal, Download, Trash2 } from "lucide-react";
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
  path: string | null;
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

  const fetchAsset = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}`);
      if (!res.ok) throw new Error("Failed to fetch asset");
      const json: AssetDetail = await res.json();
      setAsset(json);
      // Set active tab to first page if not already set
      if (!activePageId && json.pages.length > 0) {
        setActivePageId(json.pages[0].pageId);
      }
    } catch (err) {
      console.error("Asset detail fetch error:", err);
      toast.error("Failed to load asset.");
    } finally {
      setLoading(false);
    }
  }, [assetId, activePageId]);

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
      path: p.path ?? undefined,
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
      "Path",
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
          position.path ?? "",
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
          <h2 className="text-lg font-semibold">Pages</h2>
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
          <Tabs
            value={activePageId}
            onValueChange={setActivePageId}
          >
            <TabsList className="flex-wrap h-auto">
              {asset.pages.map((page) => (
                <TabsTrigger key={page.pageId} value={page.pageId}>
                  {page.name}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({page.positions.length})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {asset.pages.map((page) => (
              <TabsContent key={page.pageId} value={page.pageId}>
                {/* Page info bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    {page.path && (
                      <span className="font-mono mr-3">{page.path}</span>
                    )}
                    {page.description && <span>{page.description}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPage(page);
                        setPageDialogOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 size-4" />
                      Edit Page
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePage(page.pageId)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Archive Page
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActivePageId(page.pageId);
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
                        <TableHead>Path</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {page.positions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No positions yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        page.positions.map((position) => {
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
                                        setActivePageId(page.pageId);
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
                                          page.pageId,
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
                                          href={`/dashboard/deals?assetId=${assetId}&pageId=${page.pageId}&positionId=${position.positionId}`}
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
              </TabsContent>
            ))}
          </Tabs>
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
