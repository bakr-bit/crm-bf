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
import { DEAL_STATUSES, DEAL_STATUS_LABELS, OCCUPYING_STATUSES } from "@/lib/deal-status";
import type { DealStatusType } from "@/lib/deal-status";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
    accountManager?: { id: string; name: string | null; email: string };
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

interface UserOption {
  id: string;
  name: string;
  email: string;
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
  const [accountManagerFilter, setAccountManagerFilter] = useState("All");
  const [licenseFilter, setLicenseFilter] = useState("All");
  const [directFilter, setDirectFilter] = useState("All");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filter data
  const [partners, setPartners] = useState<Partner[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Dialog state
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [replacementDeal, setReplacementDeal] = useState<ReplacementDealInfo | null>(null);

  // Prefill from URL search params
  const router = useRouter();

  const prefillPartnerId = searchParams.get("partnerId") ?? undefined;
  const prefillBrandId = searchParams.get("brandId") ?? undefined;
  const prefillAssetId = searchParams.get("assetId") ?? undefined;
  const prefillPageId = searchParams.get("pageId") ?? undefined;
  const prefillPositionId = searchParams.get("positionId") ?? undefined;
  const prefill =
    prefillPartnerId || prefillBrandId || prefillAssetId || prefillPageId || prefillPositionId
      ? { partnerId: prefillPartnerId, brandId: prefillBrandId, assetId: prefillAssetId, pageId: prefillPageId, positionId: prefillPositionId }
      : undefined;

  // Auto-open dialog when prefill params are present
  useEffect(() => {
    if (prefill) {
      setDealDialogOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- fetch filter data ----------
  const fetchFilterData = useCallback(async () => {
    try {
      const [partnersRes, assetsRes, usersRes] = await Promise.all([
        fetch("/api/partners"),
        fetch("/api/assets"),
        fetch("/api/users"),
      ]);
      if (partnersRes.ok) {
        const data: Partner[] = await partnersRes.json();
        setPartners(data);
      }
      if (assetsRes.ok) {
        const data: Asset[] = await assetsRes.json();
        setAssets(data);
      }
      if (usersRes.ok) {
        const data: UserOption[] = await usersRes.json();
        setUsers(data);
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
      if (accountManagerFilter !== "All") params.set("accountManagerUserId", accountManagerFilter);
      if (licenseFilter !== "All") params.set("hasLicense", licenseFilter);
      if (directFilter !== "All") params.set("isDirect", directFilter);
      if (includeInactive) params.set("includeInactive", "true");

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
  }, [searchQuery, statusFilter, partnerFilter, assetFilter, geoFilter, accountManagerFilter, licenseFilter, directFilter, includeInactive]);

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
        body: JSON.stringify({ status: "Inactive" }),
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
              {DEAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {DEAL_STATUS_LABELS[s]}
                </SelectItem>
              ))}
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

        <div className="w-48">
          <Select value={accountManagerFilter} onValueChange={setAccountManagerFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by account manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Account Managers</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <Select value={licenseFilter} onValueChange={setLicenseFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="License" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">License: All</SelectItem>
              <SelectItem value="yes">Has License</SelectItem>
              <SelectItem value="no">No License</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <Select value={directFilter} onValueChange={setDirectFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Direct" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Direct: All</SelectItem>
              <SelectItem value="yes">Direct Only</SelectItem>
              <SelectItem value="no">Indirect Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="include-inactive"
            checked={includeInactive}
            onCheckedChange={(checked) => setIncludeInactive(checked === true)}
          />
          <Label htmlFor="include-inactive" className="text-sm cursor-pointer">
            Include Inactive
          </Label>
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
                        {OCCUPYING_STATUSES.includes(deal.status as DealStatusType) && (
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
