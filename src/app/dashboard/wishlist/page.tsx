"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Search, Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/countries";

interface WishlistItem {
  wishlistItemId: string;
  assetId: string | null;
  name: string;
  geo: string;
  description: string | null;
  contacted: boolean;
  contactedAt: string | null;
  contactedByUserId: string | null;
  createdAt: string;
  asset: { assetId: string; name: string; assetDomain: string | null } | null;
  contactedBy: { id: string; name: string } | null;
}

interface Asset {
  assetId: string;
  name: string;
}

function GeoFlag({ code }: { code: string }) {
  if (!code || code === "__global") return <span className="text-muted-foreground">Global</span>;
  const country = COUNTRIES.find((c) => c.code === code);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`fflag fflag-${code} ff-sm`} />
      {country?.name ?? code}
    </span>
  );
}

export default function GlobalWishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [contactedFilter, setContactedFilter] = useState("all");

  // Add form state
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addGeo, setAddGeo] = useState("__global");
  const [addAssetId, setAddAssetId] = useState("__none");
  const [addDescription, setAddDescription] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [adding, setAdding] = useState(false);

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

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((data) => setAssets(data))
      .catch(() => {});
  }, []);

  async function handleAdd() {
    if (!addName.trim()) {
      toast.error("Name is required.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          geo: addGeo,
          assetId: addAssetId === "__none" ? null : addAssetId,
          description: addDescription.trim() || undefined,
          notes: addNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create item.");
      }
      toast.success("Wishlist item added.");
      setAddName("");
      setAddGeo("__global");
      setAddAssetId("__none");
      setAddDescription("");
      setAddNotes("");
      setAddOpen(false);
      fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wishlist</h1>
          <p className="text-sm text-muted-foreground">
            Brands you want to contact across all assets
          </p>
        </div>
      </div>

      {/* Add Form */}
      <div>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(!addOpen)}>
          <Plus className="mr-2 size-4" />
          Add Item
          <ChevronDown className={`ml-2 size-4 transition-transform ${addOpen ? "rotate-180" : ""}`} />
        </Button>
        {addOpen && (
          <div className="mt-4 rounded-lg border p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Brand Name *</Label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Betway"
                />
              </div>
              <div className="grid gap-2">
                <Label>Geo *</Label>
                <Select value={addGeo} onValueChange={setAddGeo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select geo" />
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
              <div className="grid gap-2">
                <Label>Asset</Label>
                <Select value={addAssetId} onValueChange={setAddAssetId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No asset</SelectItem>
                    {assets.map((a) => (
                      <SelectItem key={a.assetId} value={a.assetId}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={1}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAdd} disabled={adding} size="sm">
                {adding ? "Adding..." : "Add to Wishlist"}
              </Button>
            </div>
          </div>
        )}
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
              <TableHead>Geo</TableHead>
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
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No wishlist items found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.wishlistItemId}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <GeoFlag code={item.geo} />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">
                    {item.description ?? "-"}
                  </TableCell>
                  <TableCell>
                    {item.asset ? (
                      <Link
                        href={`/dashboard/assets/${item.asset.assetId}`}
                        className="text-primary hover:underline"
                      >
                        {item.asset.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
