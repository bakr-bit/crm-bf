"use client";

import { useState, useEffect, useCallback } from "react";
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
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { COUNTRIES, COUNTRY_MAP } from "@/lib/countries";

// ---------- types ----------

interface DealResult {
  dealId: string;
  partnerId: string;
  brandId: string;
  assetId: string;
  positionId: string;
  affiliateLink: string | null;
  status: string;
  isDirect: boolean;
  geo: string;
  partner: {
    partnerId: string;
    name: string;
    hasLicense: boolean;
    isDirect: boolean;
    ownerUserId: string;
  };
  brand: { brandId: string; name: string };
  asset: { assetId: string; name: string };
  position: { positionId: string; name: string };
}

interface Partner {
  partnerId: string;
  name: string;
  ownerUserId: string;
}

// ---------- component ----------

export default function DealSearchPage() {
  const router = useRouter();

  // Primary filter
  const [geoFilter, setGeoFilter] = useState("");

  // Secondary filters
  const [partnerFilter, setPartnerFilter] = useState("All");
  const [licenseFilter, setLicenseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [directFilter, setDirectFilter] = useState("All");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Data
  const [deals, setDeals] = useState<DealResult[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch partners for filter dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/partners");
        if (!res.ok) return;
        const json: Partner[] = await res.json();
        setPartners(json);
      } catch {
        // silent
      }
    })();
  }, []);

  // Fetch deals when filters change
  const fetchDeals = useCallback(async () => {
    if (!geoFilter) {
      setDeals([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("geo", geoFilter);

      if (partnerFilter !== "All") {
        // Find the partner's ownerUserId
        const p = partners.find((x) => x.partnerId === partnerFilter);
        if (p) params.set("ownerUserId", p.ownerUserId);
      }
      if (licenseFilter !== "All") params.set("hasLicense", licenseFilter);
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (directFilter !== "All") params.set("isDirect", directFilter);
      if (includeInactive) params.set("includeInactive", "true");

      const res = await fetch(`/api/deal-search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to search deals");
      const json: DealResult[] = await res.json();
      setDeals(json);
    } catch (err) {
      console.error("Deal search error:", err);
      toast.error("Failed to search deals.");
    } finally {
      setLoading(false);
    }
  }, [geoFilter, partnerFilter, licenseFilter, statusFilter, directFilter, includeInactive, partners]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Deal Search</h1>

      {/* Primary filter: Country */}
      <div className="w-64">
        <Select value={geoFilter} onValueChange={setGeoFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap items-center gap-4">
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

        <div className="w-40">
          <Select value={licenseFilter} onValueChange={setLicenseFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="License" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All License</SelectItem>
              <SelectItem value="yes">Licensed</SelectItem>
              <SelectItem value="no">Unlicensed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
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

        <div className="w-40">
          <Select value={directFilter} onValueChange={setDirectFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Direct" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="yes">Direct</SelectItem>
              <SelectItem value="no">Indirect</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Include inactive deals (Ended / Expired)
        </label>
      </div>

      {/* Results */}
      {!geoFilter ? (
        <div className="rounded-lg border p-12 text-center text-muted-foreground">
          Select a country to search deals.
        </div>
      ) : loading ? (
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Geo</TableHead>
                <TableHead>Affiliate Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Direct</TableHead>
                <TableHead>License</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground"
                  >
                    No deals found for {COUNTRY_MAP[geoFilter] ?? geoFilter}.
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
                      {deal.brand.name}
                    </TableCell>
                    <TableCell>{deal.partner.name}</TableCell>
                    <TableCell>{deal.asset.name}</TableCell>
                    <TableCell>{deal.position.name}</TableCell>
                    <TableCell>
                      {COUNTRY_MAP[deal.geo] ?? deal.geo ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs">
                      {deal.affiliateLink ?? "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={deal.status} variant="deal" />
                    </TableCell>
                    <TableCell>
                      {deal.isDirect ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>
                      {deal.partner.hasLicense ? (
                        <Badge variant="default" className="text-xs">
                          Licensed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          No
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
