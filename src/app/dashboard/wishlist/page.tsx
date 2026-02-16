"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface WishlistItem {
  wishlistItemId: string;
  assetId: string;
  name: string;
  description: string | null;
  contacted: boolean;
  contactedAt: string | null;
  contactedByUserId: string | null;
  createdAt: string;
  asset: { assetId: string; name: string; assetDomain: string | null };
  contactedBy: { id: string; name: string } | null;
}

export default function GlobalWishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [contactedFilter, setContactedFilter] = useState("all");

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (contactedFilter !== "all") {
        params.set("contacted", contactedFilter === "contacted" ? "true" : "false");
      }
      if (search) {
        params.set("search", search);
      }
      const res = await fetch(`/api/wishlist?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: WishlistItem[] = await res.json();
      setItems(data);
    } catch {
      toast.error("Failed to load wishlist items.");
    } finally {
      setLoading(false);
    }
  }, [search, contactedFilter]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(fetchItems, 300);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Wishlist</h1>
        <p className="text-sm text-muted-foreground">
          Brands you want to contact across all assets
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={contactedFilter} onValueChange={setContactedFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="not_contacted">Not Contacted</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Contacted</TableHead>
              <TableHead>Contacted By</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No wishlist items found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.wishlistItemId}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">
                    {item.description ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/assets/${item.asset.assetId}`}
                      className="text-primary hover:underline"
                    >
                      {item.asset.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {item.contacted ? (
                      <Badge variant="default" className="bg-green-600">Contacted</Badge>
                    ) : (
                      <Badge variant="outline">Not Contacted</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.contactedBy?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.contactedAt
                      ? new Date(item.contactedAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
