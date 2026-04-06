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
import { DealDialog } from "@/components/dashboard/DealDialog";
import { EditDealDialog } from "@/components/dashboard/EditDealDialog";
import { DealReplacementDialog } from "@/components/dashboard/DealReplacementDialog";
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
import { ArrowLeft, Pencil, Plus, MoreHorizontal, Download, Trash2, Search, Star, Lock, GripVertical, Copy, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";
import { COUNTRIES } from "@/lib/countries";
import type { DealStatusType } from "@/lib/deal-status";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AdminOnlyBanner } from "@/components/dashboard/AdminOnlyBanner";
import { useCurrentUser } from "@/hooks/use-current-user";

// ---------- types ----------

interface DealBrand {
  brandId: string;
  name: string;
}

interface DealAffiliateLink {
  affiliateLinkId: string;
  label: string;
  url: string;
  geo: string;
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
  dealTerms: string | null;
  affiliateLink: string | null;
  affiliateLinkRef: DealAffiliateLink | null;
}

interface Position {
  positionId: string;
  pageId: string;
  name: string;
  details: string | null;
  sortOrder: number;
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

interface UnpositionedDeal {
  dealId: string;
  partnerId: string;
  partner: DealPartner;
  brandId: string;
  brand: DealBrand;
  page: { pageId: string; name: string } | null;
  geo: string;
  status: string;
  startDate: string;
  endDate: string | null;
  dealTerms: string | null;
}

interface AssetDetail {
  assetId: string;
  name: string;
  assetDomain: string | null;
  description: string | null;
  geos: string[];
  adminOnly: boolean;
  createdAt: string;
  updatedAt: string;
  pages: Page[];
  unpositionedDeals: UnpositionedDeal[];
}

interface UserOption {
  id: string;
  name: string;
}

interface WishlistItem {
  wishlistItemId: string;
  assetId: string | null;
  name: string;
  geo: string;
  description: string | null;
  notes: string | null;
  contacted: boolean;
  contactedAt: string | null;
  contactedBy: { id: string; name: string } | null;
  assignedToUserId: string | null;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
}

interface PositionHistoryChange {
  positionId: string;
  fromPosition: string;
  toPosition: string;
  brandName: string | null;
  brandId: string | null;
}

interface PositionHistoryEntry {
  id: string;
  timestamp: string;
  user: { name: string | null; email: string };
  changes: PositionHistoryChange[];
}

// ---------- sortable row ----------

function SortablePositionRow({
  position,
  children,
}: {
  position: Position;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: position.positionId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8 cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="size-4 text-muted-foreground" />
      </TableCell>
      {children}
    </TableRow>
  );
}

// ---------- positions table with DnD ----------

function PositionsTable({
  positions: initialPositions,
  activePage,
  assetId,
  getActiveDeal,
  setEditingPosition,
  setPositionDialogOpen,
  handleDeletePosition,
  handleEndDeal,
  fetchAsset,
  onEditDeal,
  onCreateDeal,
  onReplaceDeal,
}: {
  positions: Position[];
  activePage: Page;
  assetId: string;
  getActiveDeal: (position: Position) => PositionDeal | undefined;
  setEditingPosition: (p: Position | undefined) => void;
  setPositionDialogOpen: (open: boolean) => void;
  handleDeletePosition: (pageId: string, positionId: string) => void;
  handleEndDeal: (dealId: string) => void;
  fetchAsset: () => void;
  onEditDeal: (dealId: string) => void;
  onCreateDeal: (pageId: string, positionId: string) => void;
  onReplaceDeal: (deal: PositionDeal, position: Position) => void;
}) {
  const [positions, setPositions] = useState<Position[]>(initialPositions);

  // Sync with parent when positions change (e.g. after refetch)
  useEffect(() => {
    setPositions(initialPositions);
  }, [initialPositions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = positions.findIndex((p) => p.positionId === active.id);
    const newIndex = positions.findIndex((p) => p.positionId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update
    const reordered = arrayMove(positions, oldIndex, newIndex).map((p, i) => ({
      ...p,
      name: String(i + 1),
      sortOrder: i,
    }));
    setPositions(reordered);

    try {
      const res = await fetch(
        `/api/assets/${assetId}/pages/${activePage.pageId}/positions/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderedIds: reordered.map((p) => p.positionId),
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to reorder");
      fetchAsset();
    } catch {
      toast.error("Failed to reorder positions.");
      fetchAsset();
    }
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Name</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deal Terms</TableHead>
            <TableHead>Affiliate Link</TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground"
              >
                No positions yet.
              </TableCell>
            </TableRow>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={positions.map((p) => p.positionId)}
                strategy={verticalListSortingStrategy}
              >
                {positions.map((position) => {
                  const activeDeal = getActiveDeal(position);
                  const isOccupied = Boolean(activeDeal);

                  return (
                    <SortablePositionRow
                      key={position.positionId}
                      position={position}
                    >
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
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {activeDeal?.dealTerms ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {activeDeal?.affiliateLinkRef ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-muted-foreground text-xs truncate" title={activeDeal.affiliateLinkRef.url}>
                              {activeDeal.affiliateLinkRef.label}
                            </span>
                            <button
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title="Copy affiliate link"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(activeDeal.affiliateLinkRef!.url);
                                toast.success("Affiliate link copied.");
                              }}
                            >
                              <Copy className="size-3.5" />
                            </button>
                          </div>
                        ) : activeDeal?.affiliateLink ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-muted-foreground text-xs truncate" title={activeDeal.affiliateLink}>
                              {activeDeal.affiliateLink}
                            </span>
                            <button
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title="Copy affiliate link"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(activeDeal.affiliateLink!);
                                toast.success("Affiliate link copied.");
                              }}
                            >
                              <Copy className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
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
                                  onClick={() => onEditDeal(activeDeal!.dealId)}
                                >
                                  Edit Deal
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    handleEndDeal(activeDeal!.dealId)
                                  }
                                >
                                  End Deal
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onReplaceDeal(activeDeal!, position)}
                                >
                                  Replace Deal
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => onCreateDeal(activePage.pageId, position.positionId)}
                              >
                                Create Deal
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </SortablePositionRow>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------- component ----------

export default function AssetDetailPage() {
  const params = useParams<{ assetId: string }>();
  const assetId = params.assetId;

  const router = useRouter();
  const currentUser = useCurrentUser();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeDealCount, setActiveDealCount] = useState<number | null>(null);
  const [activeDealsForDelete, setActiveDealsForDelete] = useState<{
    dealId: string;
    brandName: string;
    partnerName: string;
    positionName: string;
    pageName: string;
    status: string;
  }[]>([]);
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
  const [bulkEndingDeals, setBulkEndingDeals] = useState(false);

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
  const [createDealDialogOpen, setCreateDealDialogOpen] = useState(false);
  const [createDealPrefill, setCreateDealPrefill] = useState<{
    assetId?: string;
    pageId?: string;
    positionId?: string;
  } | undefined>(undefined);
  const [editDealDialogOpen, setEditDealDialogOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string>("");
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [replacementDeal, setReplacementDeal] = useState<{
    dealId: string;
    assetId: string;
    positionId: string | null;
    assetName: string;
    positionName: string;
  } | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<PositionHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyBrandFilter, setHistoryBrandFilter] = useState("All");

  // Inline geos editing
  const [editingGeos, setEditingGeos] = useState(false);
  const [editingGeosValue, setEditingGeosValue] = useState<string[]>([]);


  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistName, setWishlistName] = useState("");
  const [wishlistGeo, setWishlistGeo] = useState("__global");
  const [wishlistDesc, setWishlistDesc] = useState("");
  const [wishlistNotes, setWishlistNotes] = useState("");
  const [wishlistAssignee, setWishlistAssignee] = useState<string>("__none");
  const [wishlistAdding, setWishlistAdding] = useState(false);
  const [editingWishlistId, setEditingWishlistId] = useState<string | null>(null);
  const [editingWishlistName, setEditingWishlistName] = useState("");
  const [editingWishlistGeo, setEditingWishlistGeo] = useState("__global");
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

  async function fetchPositionHistory(pageId: string) {
    setHistoryLoading(true);
    setHistoryBrandFilter("All");
    try {
      const res = await fetch(
        `/api/audit-log?entity=Page&entityId=${pageId}&action=REORDER&limit=100&businessOnly=false`
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      const json = await res.json();
      const entries: PositionHistoryEntry[] = json.data.map(
        (entry: { logId: string; timestamp: string; user: { name: string | null; email: string }; details: { changes?: PositionHistoryChange[] } | null }) => ({
          id: entry.logId,
          timestamp: entry.timestamp,
          user: entry.user,
          changes: entry.details?.changes ?? [],
        })
      );
      setHistoryEntries(entries);
    } catch {
      toast.error("Failed to load position history.");
      setHistoryEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  }

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
          geo: wishlistGeo,
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
      setWishlistGeo("__global");
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
          geo: editingWishlistGeo,
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
    // Collect all active deals across all pages/positions
    const deals: typeof activeDealsForDelete = [];
    for (const page of asset.pages) {
      for (const pos of page.positions) {
        for (const deal of pos.deals) {
          if (OCCUPYING_STATUSES.includes(deal.status as DealStatusType)) {
            deals.push({
              dealId: deal.dealId,
              brandName: deal.brand.name,
              partnerName: deal.partner.name,
              positionName: pos.name,
              pageName: page.name,
              status: deal.status,
            });
          }
        }
      }
    }
    // Also check unpositioned deals
    for (const deal of asset.unpositionedDeals ?? []) {
      if (OCCUPYING_STATUSES.includes(deal.status as DealStatusType)) {
        deals.push({
          dealId: deal.dealId,
          brandName: deal.brand.name,
          partnerName: deal.partner.name,
          positionName: "Unpositioned",
          pageName: deal.page?.name ?? "—",
          status: deal.status,
        });
      }
    }
    setActiveDealsForDelete(deals);
    setActiveDealCount(deals.length);
    setSelectedDealIds(new Set());
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

  async function handleBulkEndDeals(dealIds: string[]) {
    if (dealIds.length === 0) return;
    setBulkEndingDeals(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/bulk-end-deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to end deals.");
      }
      const result = await res.json();
      toast.success(`${result.endedCount} deal${result.endedCount === 1 ? "" : "s"} ended.`);
      // Remove ended deals from the list
      const endedSet = new Set(dealIds);
      const remaining = activeDealsForDelete.filter((d) => !endedSet.has(d.dealId));
      setActiveDealsForDelete(remaining);
      setActiveDealCount(remaining.length);
      setSelectedDealIds(new Set());
      // Refresh asset data
      await fetchAsset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setBulkEndingDeals(false);
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


  async function handleToggleAdminOnly(value: boolean) {
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminOnly: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(value ? "Asset set to admin-only." : "Asset visible to all users.");
      fetchAsset();
    } catch {
      toast.error("Failed to update admin-only status.");
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

      {currentUser?.isAdmin && asset.adminOnly && (
        <AdminOnlyBanner
          entityType="asset"
          adminOnly={asset.adminOnly}
          onToggle={handleToggleAdminOnly}
        />
      )}

      {/* Asset Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{asset.name}</CardTitle>
            {currentUser?.isAdmin && !asset.adminOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleAdminOnly(true)}
              >
                <Lock className="mr-2 size-3" />
                Make Admin Only
              </Button>
            )}
          </div>
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
                    const numberedPositions = page.positions.filter((p) => p.name !== "N/A");
                    const occupiedCount = numberedPositions.filter((p) =>
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
                            {numberedPositions.length} pos
                          </span>
                        </div>
                        {page.path && (
                          <div className="mt-0.5 text-xs font-mono text-muted-foreground truncate">
                            {page.path}
                          </div>
                        )}
                        {numberedPositions.length > 0 && (
                          <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                            <span className="text-green-600">
                              {numberedPositions.length - occupiedCount} open
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
                          fetchPositionHistory(activePage.pageId);
                          setHistoryDialogOpen(true);
                        }}
                      >
                        <History className="mr-2 size-4" />
                        View History
                      </Button>
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
                  <PositionsTable
                    positions={activePage.positions}
                    activePage={activePage}
                    assetId={assetId}
                    getActiveDeal={getActiveDeal}
                    setEditingPosition={setEditingPosition}
                    setPositionDialogOpen={setPositionDialogOpen}
                    handleDeletePosition={handleDeletePosition}
                    handleEndDeal={handleEndDeal}
                    fetchAsset={fetchAsset}
                    onEditDeal={(dealId) => {
                      setEditingDealId(dealId);
                      setEditDealDialogOpen(true);
                    }}
                    onCreateDeal={(pageId, positionId) => {
                      setCreateDealPrefill({ assetId, pageId, positionId });
                      setCreateDealDialogOpen(true);
                    }}
                    onReplaceDeal={(deal, position) => {
                      setReplacementDeal({
                        dealId: deal.dealId,
                        assetId,
                        positionId: position.positionId,
                        assetName: asset!.name,
                        positionName: position.name,
                      });
                      setReplacementDialogOpen(true);
                    }}
                  />
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

      {/* Unpositioned Deals */}
      {asset && asset.unpositionedDeals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Deals without position
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              ({asset.unpositionedDeals.length})
            </span>
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Geo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deal Terms</TableHead>
                <TableHead>Start</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asset.unpositionedDeals.map((deal) => (
                <TableRow
                  key={deal.dealId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => window.open(`/dashboard/deals/${deal.dealId}`, '_blank')}
                >
                  <TableCell className="font-medium">{deal.brand.name}</TableCell>
                  <TableCell>{deal.partner.name}</TableCell>
                  <TableCell>{deal.page?.name ?? "—"}</TableCell>
                  <TableCell><GeoFlag geo={deal.geo} /></TableCell>
                  <TableCell><StatusBadge status={deal.status} variant="deal" /></TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {deal.dealTerms ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(deal.startDate).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
          <div className="w-40">
            <label className="text-sm font-medium mb-1 block">Geo *</label>
            <Select value={wishlistGeo} onValueChange={setWishlistGeo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Global" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__global">Global</SelectItem>
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
                <TableHead>Geo</TableHead>
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
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
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
                    <TableCell>
                      {editingWishlistId === item.wishlistItemId ? (
                        <Select value={editingWishlistGeo} onValueChange={setEditingWishlistGeo}>
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__global">Global</SelectItem>
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
                      ) : (
                        <GeoFlag geo={item.geo} />
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
                                setEditingWishlistGeo(item.geo ?? "__global");
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

      <DealDialog
        open={createDealDialogOpen}
        onOpenChange={setCreateDealDialogOpen}
        onSuccess={fetchAsset}
        prefill={createDealPrefill}
      />

      <EditDealDialog
        open={editDealDialogOpen}
        onOpenChange={setEditDealDialogOpen}
        dealId={editingDealId}
        onSuccess={fetchAsset}
      />

      <DealReplacementDialog
        open={replacementDialogOpen}
        onOpenChange={setReplacementDialogOpen}
        deal={replacementDeal}
        onSuccess={async () => {
          await fetchAsset();
          // If the delete dialog is open, remove the replaced deal from the list
          if (deleteDialogOpen && replacementDeal) {
            setActiveDealsForDelete((prev) => {
              const remaining = prev.filter((d) => d.dealId !== replacementDeal.dealId);
              setActiveDealCount(remaining.length);
              return remaining;
            });
          }
        }}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            {activeDealCount && activeDealCount > 0 ? (
              <DialogDescription>
                <strong>{asset.name}</strong> has{" "}
                <strong>{activeDealCount} active {activeDealCount === 1 ? "deal" : "deals"}</strong>.
                What do you want to do with them?
              </DialogDescription>
            ) : (
              <DialogDescription>
                Are you sure you want to permanently delete <strong>{asset.name}</strong>? All pages, positions, and inactive deals on this asset will also be deleted. This cannot be undone.
              </DialogDescription>
            )}
          </DialogHeader>

          {activeDealCount && activeDealCount > 0 ? (
            <div className="flex flex-col gap-3 overflow-hidden">
              {/* Select all / actions bar */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedDealIds.size === activeDealsForDelete.length && activeDealsForDelete.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDealIds(new Set(activeDealsForDelete.map((d) => d.dealId)));
                      } else {
                        setSelectedDealIds(new Set());
                      }
                    }}
                  />
                  Select all ({activeDealsForDelete.length})
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedDealIds.size === 0 || bulkEndingDeals}
                    onClick={() => handleBulkEndDeals(Array.from(selectedDealIds))}
                  >
                    {bulkEndingDeals ? "Ending..." : `End Selected (${selectedDealIds.size})`}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={bulkEndingDeals}
                    onClick={() => handleBulkEndDeals(activeDealsForDelete.map((d) => d.dealId))}
                  >
                    {bulkEndingDeals ? "Ending..." : "End All"}
                  </Button>
                </div>
              </div>

              {/* Deal list */}
              <div className="overflow-y-auto max-h-[40vh] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead className="w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeDealsForDelete.map((deal) => (
                      <TableRow key={deal.dealId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDealIds.has(deal.dealId)}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedDealIds);
                              if (checked) {
                                next.add(deal.dealId);
                              } else {
                                next.delete(deal.dealId);
                              }
                              setSelectedDealIds(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{deal.brandName}</TableCell>
                        <TableCell>{deal.partnerName}</TableCell>
                        <TableCell>{deal.pageName}</TableCell>
                        <TableCell>{deal.positionName}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Find the full deal info for replacement
                              const fullDeal = asset.pages
                                .flatMap((p) => p.positions.flatMap((pos) =>
                                  pos.deals.filter((d) => d.dealId === deal.dealId).map((d) => ({
                                    dealId: d.dealId,
                                    assetId: asset.assetId,
                                    positionId: pos.positionId,
                                    assetName: asset.name,
                                    positionName: pos.name,
                                  }))
                                ))[0];
                              if (fullDeal) {
                                setReplacementDeal(fullDeal);
                                setReplacementDialogOpen(true);
                              }
                            }}
                          >
                            Replace
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            {!activeDealCount || activeDealCount === 0 ? (
              <Button variant="destructive" onClick={handleDeleteAsset}>
                Delete Asset
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Position History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Position History</DialogTitle>
            <DialogDescription>
              History of position changes on {activePage?.name ?? "this page"}
            </DialogDescription>
          </DialogHeader>
          <div className="mb-3">
            <Select value={historyBrandFilter} onValueChange={setHistoryBrandFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Brands</SelectItem>
                {(() => {
                  const brands = new Map<string, string>();
                  historyEntries.forEach((e) =>
                    e.changes.forEach((c) => {
                      if (c.brandId && c.brandName) brands.set(c.brandId, c.brandName);
                    })
                  );
                  return Array.from(brands.entries()).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {historyLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : historyEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No position changes recorded yet.
              </p>
            ) : (
              <div className="space-y-4">
                {historyEntries.map((entry) => {
                  const filtered = historyBrandFilter === "All"
                    ? entry.changes
                    : entry.changes.filter((c) => c.brandId === historyBrandFilter);
                  if (filtered.length === 0) return null;
                  return (
                    <div key={entry.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {entry.user.name ?? entry.user.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {filtered.map((change, i) => (
                          <div key={i} className="text-sm flex items-center gap-2">
                            <span className="font-medium min-w-[120px]">
                              {change.brandName ?? "Empty position"}
                            </span>
                            <span className="text-muted-foreground">
                              Pos {change.fromPosition}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">
                              Pos {change.toPosition}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
