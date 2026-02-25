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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal, Plus, Search, Eye, Copy } from "lucide-react";
import { toast } from "sonner";
import { PARTNER_STATUSES, PARTNER_STATUS_LABELS } from "@/lib/partner-status";

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
  lastInvoicedAt: string | null;
  createdAt: string;
  updatedAt: string;
  accountManager?: { id: string; name: string | null; email: string } | null;
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

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | undefined>(
    undefined
  );
  const [deletingPartner, setDeletingPartner] = useState<Partner | undefined>(
    undefined
  );

  const fetchPartners = useCallback(async (query?: string) => {
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (directFilter !== "all") params.set("isDirect", directFilter);
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
  }, [statusFilter, directFilter]);

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

  async function handleConfirmDelete() {
    if (!deletingPartner) return;
    try {
      const res = await fetch(`/api/partners/${deletingPartner.partnerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete partner.");
      }
      toast.success("Partner deleted.");
      setDeletingPartner(undefined);
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

  // ---------- Credentials popover ----------
  interface CredentialEntry {
    credentialId: string;
    label: string;
    loginUrl: string | null;
    username: string;
    email: string | null;
    password: string | null;
  }

  const [credentialsCache, setCredentialsCache] = useState<
    Record<string, CredentialEntry[]>
  >({});
  const [credentialsLoading, setCredentialsLoading] = useState<
    Record<string, boolean>
  >({});
  async function fetchCredentials(partnerId: string) {
    if (credentialsCache[partnerId]) return;
    setCredentialsLoading((prev) => ({ ...prev, [partnerId]: true }));
    try {
      const res = await fetch(`/api/partners/${partnerId}/credentials`);
      if (!res.ok) throw new Error();
      const data: CredentialEntry[] = await res.json();
      setCredentialsCache((prev) => ({ ...prev, [partnerId]: data }));
    } catch {
      toast.error("Failed to load credentials");
    } finally {
      setCredentialsLoading((prev) => ({ ...prev, [partnerId]: false }));
    }
  }

  function handleCopyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
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
      lastInvoicedAt: p.lastInvoicedAt ?? undefined,
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
            {PARTNER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PARTNER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
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
              <TableHead>Assignee</TableHead>
              <TableHead>Last Invoiced</TableHead>
              <TableHead>Credentials</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
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
                  <TableCell className="text-muted-foreground">
                    {partner.accountManager?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.lastInvoicedAt
                      ? new Date(partner.lastInvoicedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "-"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Popover onOpenChange={(open) => { if (open) fetchCredentials(partner.partnerId); }}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Eye className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3" align="start">
                        <p className="text-sm font-semibold mb-2">Credentials</p>
                        {credentialsLoading[partner.partnerId] ? (
                          <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : !credentialsCache[partner.partnerId]?.length ? (
                          <p className="text-sm text-muted-foreground">No credentials</p>
                        ) : (
                          <div className="space-y-3">
                            {credentialsCache[partner.partnerId].map((cred) => (
                              <div key={cred.credentialId} className="rounded border p-2 text-sm space-y-1">
                                {cred.loginUrl && (
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-muted-foreground truncate">URL: {cred.loginUrl}</span>
                                    <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => handleCopyText(cred.loginUrl!, "URL")}>
                                      <Copy className="size-3" />
                                    </Button>
                                  </div>
                                )}
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-muted-foreground truncate">User: {cred.username}</span>
                                  <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => handleCopyText(cred.username, "Username")}>
                                    <Copy className="size-3" />
                                  </Button>
                                </div>
                                {cred.email && (
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-muted-foreground truncate">Email: {cred.email}</span>
                                    <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => handleCopyText(cred.email!, "Email")}>
                                      <Copy className="size-3" />
                                    </Button>
                                  </div>
                                )}
                                {cred.password && (
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono text-muted-foreground truncate">Pass: {cred.password}</span>
                                    <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => handleCopyText(cred.password!, "Password")}>
                                      <Copy className="size-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
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
                          onClick={() => setDeletingPartner(partner)}
                        >
                          Delete
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

      <Dialog open={!!deletingPartner} onOpenChange={(open) => { if (!open) setDeletingPartner(undefined); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Partner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingPartner?.name}</strong>? This action cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingPartner(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
