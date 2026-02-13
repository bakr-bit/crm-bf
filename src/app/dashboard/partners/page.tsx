"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { PartnerDialog } from "@/components/dashboard/PartnerDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

// ---------- types ----------

interface Partner {
  partnerId: string;
  name: string;
  websiteDomain: string | null;
  isDirect: boolean;
  status: string;
  hasContract: boolean;
  hasLicense: boolean;
  hasBanking: boolean;
  sopNotes: string | null;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    brands: number;
    contacts: number;
    deals: number;
  };
}

// ---------- component ----------

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directFilter, setDirectFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | undefined>(
    undefined
  );

  const fetchPartners = useCallback(async (query?: string) => {
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (directFilter !== "all") params.set("isDirect", directFilter);
      if (showArchived) params.set("showArchived", "true");
      const qs = params.toString();
      const url = `/api/partners${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch partners");
      const json: Partner[] = await res.json();
      setPartners(json);
    } catch (err) {
      console.error("Partners fetch error:", err);
      toast.error("Failed to load partners.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, directFilter, showArchived]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPartners(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchPartners]);

  function handleAdd() {
    setEditingPartner(undefined);
    setDialogOpen(true);
  }

  function handleEdit(partner: Partner) {
    setEditingPartner(partner);
    setDialogOpen(true);
  }

  async function handleArchive(partnerId: string) {
    try {
      const res = await fetch(`/api/partners/${partnerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to archive partner.");
      }
      toast.success("Partner archived.");
      fetchPartners(search || undefined);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    }
  }

  function handleDialogSuccess() {
    fetchPartners(search || undefined);
  }

  // Map partner to the shape expected by PartnerDialog
  function toDialogPartner(p: Partner) {
    return {
      id: p.partnerId,
      name: p.name,
      websiteDomain: p.websiteDomain ?? undefined,
      isDirect: p.isDirect,
      status: p.status,
      hasContract: p.hasContract,
      hasLicense: p.hasLicense,
      hasBanking: p.hasBanking,
      sopNotes: p.sopNotes ?? undefined,
    };
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Partners</h1>
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Partners</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 size-4" />
          Add Partner
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search partners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={directFilter} onValueChange={setDirectFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="true">Direct</SelectItem>
            <SelectItem value="false">Non-Direct</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <input
            id="show-archived"
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="show-archived" className="text-sm text-muted-foreground">
            Show archived
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Direct?</TableHead>
              <TableHead>Brands</TableHead>
              <TableHead>Active Deals</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No partners found.
                </TableCell>
              </TableRow>
            ) : (
              partners.map((partner) => (
                <TableRow key={partner.partnerId} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/dashboard/partners/${partner.partnerId}`}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/partners/${partner.partnerId}`} className="text-primary underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
                      {partner.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.websiteDomain ?? "-"}
                  </TableCell>
                  <TableCell>{partner.isDirect ? "Yes" : "No"}</TableCell>
                  <TableCell>{partner._count.brands}</TableCell>
                  <TableCell>{partner._count.deals}</TableCell>
                  <TableCell>
                    <StatusBadge status={partner.status} variant="partner" />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(partner)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/partners/${partner.partnerId}`}
                          >
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleArchive(partner.partnerId)}
                        >
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Partner Dialog */}
      <PartnerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        partner={editingPartner ? toDialogPartner(editingPartner) : undefined}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
