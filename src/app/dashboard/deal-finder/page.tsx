"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

// ---------- types ----------

interface OpenPosition {
  positionId: string;
  name: string;
  details: string | null;
  asset: {
    assetId: string;
    name: string;
    assetDomain: string | null;
  };
  deals: {
    dealId: string;
    geo: string;
    status: string;
    partner: { partnerId: string; name: string };
    brand: { brandId: string; name: string };
  }[];
}

// ---------- component ----------

export default function DealFinderPage() {
  const [geoFilter, setGeoFilter] = useState("");
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOpenPositions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (geoFilter) params.set("geo", geoFilter);
      const res = await fetch(`/api/open-positions?${params}`);
      if (!res.ok) throw new Error();
      const data: OpenPosition[] = await res.json();
      setOpenPositions(data);
    } catch {
      toast.error("Failed to load open positions");
    } finally {
      setLoading(false);
    }
  }, [geoFilter]);

  useEffect(() => {
    fetchOpenPositions();
  }, [fetchOpenPositions]);

  // Group open positions by asset
  const positionsByAsset = openPositions.reduce<
    Record<string, { asset: OpenPosition["asset"]; positions: OpenPosition[] }>
  >((acc, pos) => {
    const key = pos.asset.assetId;
    if (!acc[key]) {
      acc[key] = { asset: pos.asset, positions: [] };
    }
    acc[key].positions.push(pos);
    return acc;
  }, {});

  const totalOpen = openPositions.filter((p) => p.deals.length === 0).length;
  const totalOccupied = openPositions.filter((p) => p.deals.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Deal Finder</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Find open positions across your assets
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={geoFilter || "__all"}
          onValueChange={(v) => setGeoFilter(v === "__all" ? "" : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by geo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Geos</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {geoFilter && (
          <Badge variant="secondary" className="text-sm">
            Showing positions open for {geoFilter}
          </Badge>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-zinc-500">Open Positions</div>
            <div className="mt-1 text-2xl font-bold text-green-600">
              {totalOpen}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-zinc-500">Occupied</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">
              {totalOccupied}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-zinc-500">Total Positions</div>
            <div className="mt-1 text-2xl font-bold">
              {openPositions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions grouped by asset */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : Object.keys(positionsByAsset).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">
              No positions found
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {geoFilter
                ? `No positions are open for ${geoFilter}`
                : "No active positions exist"}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.values(positionsByAsset).map(({ asset, positions }) => (
          <div key={asset.assetId} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{asset.name}</h3>
              {asset.assetDomain && (
                <span className="text-xs text-zinc-400">
                  {asset.assetDomain}
                </span>
              )}
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Deals</TableHead>
                    <TableHead className="w-32">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos) => {
                    const isOpen = pos.deals.length === 0;
                    return (
                      <TableRow key={pos.positionId}>
                        <TableCell className="font-medium">
                          {pos.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {pos.details ?? "-"}
                        </TableCell>
                        <TableCell>
                          {isOpen ? (
                            <span className="text-sm font-medium text-green-600">
                              Open
                            </span>
                          ) : (
                            <span className="text-sm text-blue-600">
                              Occupied
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {pos.deals.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {pos.deals.map((d) => (
                                <Badge
                                  key={d.dealId}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {d.brand.name} ({d.geo}) —{" "}
                                  {d.partner.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-sm">
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              href={`/dashboard/deals?assetId=${asset.assetId}&positionId=${pos.positionId}`}
                            >
                              Create Deal
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
