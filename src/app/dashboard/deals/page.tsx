"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DealDialog } from "@/components/dashboard/DealDialog";
import { DealReplacementDialog } from "@/components/dashboard/DealReplacementDialog";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import { GeoFlag } from "@/components/dashboard/GeoFlag";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// ---------- types ----------

interface Deal {
  dealId: string;
  partnerId: string;
  brandId: string;
  assetId: string;
  positionId: string;
  affiliateLink: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  geo: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  partner: {
    name: string;
  };
  brand: {
    name: string;
  };
  asset: {
    name: string;
  };
  position: {
    name: string;
  };
}

interface Partner {
  partnerId: string;
  name: string;
}

interface Asset {
  assetId: string;
  name: string;
}

interface ReplacementDealInfo {
  dealId: string;
  assetId: string;
  positionId: string;
  assetName: string;
  positionName: string;
}

// ---------- component ----------

export default function DealsPage() {
  const searchParams = useSearchParams();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [partnerFilter, setPartnerFilter] = useState("All");
  const [assetFilter, setAssetFilter] = useState("All");
  const [geoFilter, setGeoFilter] = useState("All");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filter data
  const [partners, setPartners] = useState<Partner[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Dialog state
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [replacementDeal, setReplacementDeal] = useState<ReplacementDealInfo | null>(null);

  // Prefill from URL search params
  const router = useRouter();

  const prefillAssetId = searchParams.get("assetId") ?? undefined;
  const prefillPositionId = searchParams.get("positionId") ?? undefined;
  const prefill =
    prefillAssetId || prefillPositionId
      ? { assetId: prefillAssetId, positionId: prefillPositionId }
      : undefined;

  // ---------- fetch filter data ----------
  const fetchFilterData = useCallback(async () => {
    try {
      const [partnersRes, assetsRes] = await Promise.all([
        fetch("/api/partners"),
        fetch("/api/assets"),
      ]);
      if (partnersRes.ok) {
        const data: Partner[] = await partnersRes.json();
        setPartners(data);
      }
      if (assetsRes.ok) {
        const data: Asset[] = await assetsRes.json();
        setAssets(data);
      }
    } catch {
      console.error("Failed to load filter data");
    }
  }, []);

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  // ---------- fetch deals ----------
  const fetchDeals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (partnerFilter !== "All") params.set("partnerId", partnerFilter);
      if (assetFilter !== "All") params.set("assetId", assetFilter);
      if (geoFilter !== "All") params.set("geo", geoFilter);

      const qs = params.toString();
      const url = qs ? `/api/deals?${qs}` : "/api/deals";

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch deals");
      const json: Deal[] = await res.json();
      setDeals(json);
    } catch (err) {
      console.error("Deals fetch error:", err);
      toast.error("Failed to load deals.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, partnerFilter, assetFilter, geoFilter]);

  useEffect(() => {
    setLoading(true);
    fetchDeals();
  }, [fetchDeals]);

  // ---------- actions ----------
  function handleCreateDeal() {
    setDealDialogOpen(true);
  }

  function handleReplaceDeal(deal: Deal) {
    setReplacementDeal({
      dealId: deal.dealId,
      assetId: deal.assetId,
      positionId: deal.positionId,
      assetName: deal.asset.name,
      positionName: deal.position.name,
    });
    setReplacementDialogOpen(true);
  }

  async function handleEndDeal(dealId: string) {
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Ended" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to end deal.");
      }

      toast.success("Deal ended.");
      fetchDeals();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
  }

  function handleDialogSuccess() {
    fetchDeals();
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  }

  // ---------- render ----------
  if (loading && deals.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Deals</h1>
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deals</h1>
        <Button onClick={handleCreateDeal}>
          <Plus className="mr-2 size-4" />
          Create Deal
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search brand, partner, asset..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="PendingValidation">Pending Validation</SelectItem>
              <SelectItem value="Ended">Ended</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by partner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Partners</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.partnerId} value={p.partnerId}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select value={assetFilter} onValueChange={setAssetFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Assets</SelectItem>
              {assets.map((a) => (
                <SelectItem key={a.assetId} value={a.assetId}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select value={geoFilter} onValueChange={setGeoFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by geo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Geos</SelectItem>
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
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Geo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground"
                >
                  No deals found.
                </TableCell>
              </TableRow>
            ) : (
              deals.map((deal) => (
                <TableRow
                  key={deal.dealId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/dashboard/deals/${deal.dealId}`)
                  }
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/partners/${deal.partnerId}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {deal.brand.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/partners/${deal.partnerId}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {deal.partner.name}
                    </Link>
                  </TableCell>
                  <TableCell>{deal.asset.name}</TableCell>
                  <TableCell>{deal.position.name}</TableCell>
                  <TableCell><GeoFlag geo={deal.geo} /></TableCell>
                  <TableCell>
                    <StatusBadge status={deal.status} variant="deal" />
                  </TableCell>
                  <TableCell>{formatDate(deal.startDate)}</TableCell>
                  <TableCell>{formatDate(deal.endDate)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {deal.status === "Active" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleEndDeal(deal.dealId)}
                            >
                              End Deal
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleReplaceDeal(deal)}
                            >
                              Replace Deal
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <DealDialog
        open={dealDialogOpen}
        onOpenChange={setDealDialogOpen}
        onSuccess={handleDialogSuccess}
        prefill={prefill}
      />

      <DealReplacementDialog
        open={replacementDialogOpen}
        onOpenChange={setReplacementDialogOpen}
        deal={replacementDeal}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
