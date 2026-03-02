"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { GeoFlag } from "@/components/dashboard/GeoFlag";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { COUNTRIES, COUNTRY_MAP } from "@/lib/countries";
import { LICENSE_MAP } from "@/lib/licenses";

// ---------- types ----------

interface BrandResult {
  brandId: string;
  name: string;
  brandDomain: string | null;
  targetGeos: string[];
  licenses: string[];
  affiliateSoftware: string | null;
  status: string;
  partner: {
    partnerId: string;
    name: string;
  };
  _count: {
    deals: number;
  };
}

// ---------- component ----------

export default function DealFinderPage() {
  const [geoFilter, setGeoFilter] = useState("");
  const [brands, setBrands] = useState<BrandResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (geoFilter) params.set("geo", geoFilter);
      const res = await fetch(`/api/brands?${params}`);
      if (!res.ok) throw new Error();
      const data: BrandResult[] = await res.json();
      setBrands(data);
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [geoFilter]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Brands</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse brands by target geo
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
            Showing brands targeting {geoFilter}
          </Badge>
        )}

        <span className="text-sm text-muted-foreground">
          {brands.length} brand{brands.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Brands table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          {geoFilter
            ? `No brands targeting ${geoFilter}`
            : "No active brands found"}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Licenses</TableHead>
                <TableHead>Target Geos</TableHead>
                <TableHead>Software</TableHead>
                <TableHead>Deals</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.brandId}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/partners/${brand.partner.partnerId}`}
                      className="text-primary hover:underline"
                    >
                      {brand.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/partners/${brand.partner.partnerId}`}
                      className="text-muted-foreground hover:underline"
                    >
                      {brand.partner.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {brand.brandDomain ?? "-"}
                  </TableCell>
                  <TableCell>
                    {brand.licenses.length === 0 ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {brand.licenses.map((code) => (
                          <Badge key={code} variant="outline" className="text-xs">
                            <GeoFlag geo={code} size="sm" showLabel={false} />
                            {COUNTRY_MAP[code] ?? LICENSE_MAP[code] ?? code}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {brand.targetGeos.length === 0 ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {brand.targetGeos.map((geo) => (
                          <Badge key={geo} variant="outline" className="text-xs">
                            <GeoFlag geo={geo} size="sm" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {brand.affiliateSoftware ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {brand._count.deals}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={brand.status} variant="brand" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
