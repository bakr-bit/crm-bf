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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GeoFlag } from "@/components/dashboard/GeoFlag";
import { GeoMultiSelect } from "@/components/dashboard/GeoMultiSelect";
import { ArrowLeft, Pencil, Plus, MoreHorizontal, Download, Trash2, Search, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";
import type { DealStatusType } from "@/lib/deal-status";

// ---------- types ----------

interface DealBrand {
  brandId: string;
  name: string;
  postbacks: string | null;
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
  geos: string[];
  createdAt: string;
  updatedAt: string;
  pages: Page[];
}

interface UserOption {
  id: string;
  name: string;
}

interface WishlistItem {
  wishlistItemId: string;
  assetId: string;
  name: string;
  description: string | null;
  notes: string | null;
  contacted: boolean;
  contactedAt: string | null;
  contactedBy: { id: string; name: string } | null;
  assignedToUserId: string | null;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
}

// ---------- component ----------

export default function AssetDetailPage() {
  const params = useParams<{ assetId: string }>();
  const assetId = params.assetId;

  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeDealCount, setActiveDealCount] = useState<number | null>(null);

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

  // Inline geos editing
  const [editingGeos, setEditingGeos] = useState(false);
  const [editingGeosValue, setEditingGeosValue] = useState<string[]>([]);

  // Inline postback editing
  const [editingPostbackBrandId, setEditingPostbackBrandId] = useState<string | null>(null);
  const [editingPostbackValue, setEditingPostbackValue] = useState("");

  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistName, setWishlistName] = useState("");
  const [wishlistDesc, setWishlistDesc] = useState("");
  const [wishlistNotes, setWishlistNotes] = useState("");
  const [wishlistAssignee, setWishlistAssignee] = useState<string>("__none");
  const [wishlistAdding, setWishlistAdding] = useState(false);
  const [editingWishlistId, setEditingWishlistId] = useState<string | null>(null);
  const [editingWishlistName, setEditingWishlistName] = useState("");
  const [editingWishlistDesc, setEditingWishlistDesc] = useState("");
  const [editingWishlistNotes, setEditingWishlistNotes] = useState("");
  const [editingWishlistAssignee, setEditingWishlistAssignee] = useState<string>("");
  const [users, setUsers] = useState<UserOption[]>([]);

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}/wishlist`);
      if (!res.ok) return;
      const data: WishlistItem[] = await res.json();
      setWishlistItems(data);
    } catch {
      // silent
    }
  }, [assetId]);

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
    fetchWishlist();
    fetch("/api/users").then((r) => r.ok ? r.json() : []).then(setUsers).catch(() => {});
  }, [fetchAsset, fetchWishlist]);

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
      geos: a.geos,
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

  async function handleAddWishlistItem() {
    if (!wishlistName.trim()) return;
    setWishlistAdding(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wishlistName.trim(),
          description: wishlistDesc.trim() || undefined,
          notes: wishlistNotes.trim() || undefined,
          assignedToUserId: (wishlistAssignee && wishlistAssignee !== "__none") ? wishlistAssignee : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to add wishlist item.");
      }
      toast.success("Added to wishlist.");
      setWishlistName("");
      setWishlistDesc("");
      setWishlistNotes("");
      setWishlistAssignee("__none");
      fetchWishlist();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setWishlistAdding(false);
    }
  }

  async function handleToggleContacted(item: WishlistItem) {
    try {
      const res = await fetch(`/api/assets/${assetId}/wishlist/${item.wishlistItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacted: !item.contacted }),
      });
      if (!res.ok) throw new Error("Failed to update.");
      fetchWishlist();
    } catch {
      toast.error("Failed to update contacted status.");
    }
  }

  async function handleDeleteWishlistItem(wishlistItemId: string) {
    try {
      const res = await fetch(`/api/assets/${assetId}/wishlist/${wishlistItemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete.");
      toast.success("Wishlist item deleted.");
      fetchWishlist();
    } catch {
      toast.error("Failed to delete wishlist item.");
    }
  }

  async function handleSaveWishlistEdit(wishlistItemId: string) {
    try {
      const res = await fetch(`/api/assets/${assetId}/wishlist/${wishlistItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingWishlistName.trim(),
          description: editingWishlistDesc.trim() || undefined,
          notes: editingWishlistNotes.trim() || undefined,
          assignedToUserId: (editingWishlistAssignee && editingWishlistAssignee !== "__none") ? editingWishlistAssignee : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update.");
      }
      toast.success("Wishlist item updated.");
      setEditingWishlistId(null);
      fetchWishlist();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
  }

  async function handleOpenDeleteDialog() {
    if (!asset) return;
    // Count active deals across all pages/positions
    const count = asset.pages.reduce((sum, page) =>
      sum + page.positions.reduce((pSum, pos) =>
        pSum + pos.deals.filter((d) => OCCUPYING_STATUSES.includes(d.status as DealStatusType)).length, 0), 0);
    setActiveDealCount(count);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteAsset() {
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete asset.");
      }
      toast.success("Asset deleted.");
      router.push("/dashboard/assets");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
      setDeleteDialogOpen(false);
    }
  }

  async function handleSaveGeos() {
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geos: editingGeosValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update geos.");
      }
      toast.success("Geos updated.");
      setEditingGeos(false);
      fetchAsset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
  }

  async function handleSavePostback(brandId: string) {
    try {
      const res = await fetch(`/api/brands/${brandId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postbacks: editingPostbackValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update postback.");
      }
      toast.success("Postback updated.");
      setEditingPostbackBrandId(null);
      fetchAsset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDeleteDialog}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
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
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground mb-1">
                Target Geos
              </dt>
              <dd>
                {editingGeos ? (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <GeoMultiSelect value={editingGeosValue} onChange={setEditingGeosValue} />
                    </div>
                    <Button size="sm" onClick={handleSaveGeos}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingGeos(false)}>Cancel</Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex flex-wrap gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => {
                      setEditingGeosValue(asset.geos);
                      setEditingGeos(true);
                    }}
                  >
                    {asset.geos.length > 0 ? (
                      asset.geos.map((g) => (
                        <GeoFlag key={g} geo={g} showLabel />
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Click to add geos</span>
                    )}
                  </button>
                )}
              </dd>
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
                          <TableHead>Postback</TableHead>
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activePage.positions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
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
                                <TableCell className="text-sm">
                                  {activeDeal && editingPostbackBrandId === activeDeal.brand.brandId ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        value={editingPostbackValue}
                                        onChange={(e) => setEditingPostbackValue(e.target.value)}
                                        className="h-7 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleSavePostback(activeDeal.brand.brandId);
                                          if (e.key === "Escape") setEditingPostbackBrandId(null);
                                        }}
                                      />
                                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleSavePostback(activeDeal.brand.brandId)}>
                                        Save
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingPostbackBrandId(null)}>
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer text-left"
                                      onClick={() => {
                                        if (activeDeal) {
                                          setEditingPostbackBrandId(activeDeal.brand.brandId);
                                          setEditingPostbackValue(activeDeal.brand.postbacks ?? "");
                                        }
                                      }}
                                      disabled={!activeDeal}
                                    >
                                      {activeDeal?.brand.postbacks || "-"}
                                    </button>
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

      {/* Wishlist Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="size-5" />
            Wishlist
            <span className="text-sm font-normal text-muted-foreground">
              ({wishlistItems.length})
            </span>
          </h2>
        </div>

        {/* Add form */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 max-w-xs">
            <label className="text-sm font-medium mb-1 block">Brand Name</label>
            <Input
              placeholder="e.g. Acme Corp"
              value={wishlistName}
              onChange={(e) => setWishlistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddWishlistItem();
              }}
            />
          </div>
          <div className="flex-1 max-w-xs">
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              placeholder="Optional..."
              value={wishlistDesc}
              onChange={(e) => setWishlistDesc(e.target.value)}
            />
          </div>
          <div className="flex-1 max-w-xs">
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Input
              placeholder="Optional..."
              value={wishlistNotes}
              onChange={(e) => setWishlistNotes(e.target.value)}
            />
          </div>
          <div className="w-40">
            <label className="text-sm font-medium mb-1 block">Assign To</label>
            <Select value={wishlistAssignee} onValueChange={setWishlistAssignee}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={handleAddWishlistItem}
            disabled={!wishlistName.trim() || wishlistAdding}
          >
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        </div>

        {/* Wishlist table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Contacted</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Contacted By</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wishlistItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No wishlist items yet. Add brands you want to work with.
                  </TableCell>
                </TableRow>
              ) : (
                wishlistItems.map((item) => (
                  <TableRow key={item.wishlistItemId} className={item.contacted ? "opacity-60" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={item.contacted}
                        onCheckedChange={() => handleToggleContacted(item)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {editingWishlistId === item.wishlistItemId ? (
                        <Input
                          value={editingWishlistName}
                          onChange={(e) => setEditingWishlistName(e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        <span className={item.contacted ? "line-through" : ""}>{item.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {editingWishlistId === item.wishlistItemId ? (
                        <Input
                          value={editingWishlistDesc}
                          onChange={(e) => setEditingWishlistDesc(e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        item.description ?? "-"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {editingWishlistId === item.wishlistItemId ? (
                        <Input
                          value={editingWishlistNotes}
                          onChange={(e) => setEditingWishlistNotes(e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        item.notes ?? "-"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {editingWishlistId === item.wishlistItemId ? (
                        <Select value={editingWishlistAssignee} onValueChange={setEditingWishlistAssignee}>
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">Unassigned</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        item.assignedTo?.name ?? "-"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.contacted && item.contactedBy ? (
                        <span>
                          {item.contactedBy.name}
                          {item.contactedAt && (
                            <span className="ml-1 text-xs">
                              ({new Date(item.contactedAt).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {editingWishlistId === item.wishlistItemId ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveWishlistEdit(item.wishlistItemId)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingWishlistId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingWishlistId(item.wishlistItemId);
                                setEditingWishlistName(item.name);
                                setEditingWishlistDesc(item.description ?? "");
                                setEditingWishlistNotes(item.notes ?? "");
                                setEditingWishlistAssignee(item.assignedToUserId ?? "__none");
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDeleteWishlistItem(item.wishlistItemId)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            {activeDealCount && activeDealCount > 0 ? (
              <DialogDescription>
                <strong>{asset.name}</strong> cannot be deleted because it has{" "}
                <strong>{activeDealCount} active {activeDealCount === 1 ? "deal" : "deals"}</strong>.
                End or replace all active deals on this asset before deleting it.
              </DialogDescription>
            ) : (
              <DialogDescription>
                Are you sure you want to permanently delete <strong>{asset.name}</strong>? All pages, positions, and inactive deals on this asset will also be deleted. This cannot be undone.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {activeDealCount && activeDealCount > 0 ? "Close" : "Cancel"}
            </Button>
            {!activeDealCount || activeDealCount === 0 ? (
              <Button variant="destructive" onClick={handleDeleteAsset}>
                Delete
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
