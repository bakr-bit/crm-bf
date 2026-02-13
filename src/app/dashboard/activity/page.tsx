"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import Link from "next/link";
import { toast } from "sonner";

// ---------- types ----------

interface AuditLogEntry {
  logId: string;
  userId: string;
  user: { id: string; name: string | null; email: string };
  entity: string;
  entityId: string;
  action: string;
  details: Record<string, unknown> | null;
  timestamp: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ---------- component ----------

const LIMIT = 50;

export default function ActivityPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [entityFilter, setEntityFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ---------- fetch audit log ----------
  const fetchAuditLog = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (entityFilter !== "All") params.set("entity", entityFilter);
      if (actionFilter !== "All") params.set("action", actionFilter);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const qs = params.toString();
      const url = `/api/audit-log?${qs}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch audit log");
      const json: AuditLogResponse = await res.json();
      setEntries(json.data);
      setTotalPages(json.pagination.totalPages);
    } catch (err) {
      console.error("Audit log fetch error:", err);
      toast.error("Failed to load activity log.");
    } finally {
      setLoading(false);
    }
  }, [entityFilter, actionFilter, page]);

  useEffect(() => {
    setLoading(true);
    fetchAuditLog();
  }, [fetchAuditLog]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [entityFilter, actionFilter]);

  function formatTimestamp(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  }

  function formatDetails(details: Record<string, unknown> | null): string {
    if (!details) return "-";
    try {
      const str = JSON.stringify(details);
      return str.length > 120 ? str.slice(0, 120) + "..." : str;
    } catch {
      return "-";
    }
  }

  // ---------- render ----------
  if (loading && entries.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Activity Log</h1>
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Activity Log</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-48">
          <Label className="mb-1 block text-xs text-muted-foreground">
            Entity Type
          </Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Entities</SelectItem>
              <SelectItem value="Partner">Partner</SelectItem>
              <SelectItem value="Brand">Brand</SelectItem>
              <SelectItem value="Contact">Contact</SelectItem>
              <SelectItem value="Asset">Asset</SelectItem>
              <SelectItem value="Position">Position</SelectItem>
              <SelectItem value="Deal">Deal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label className="mb-1 block text-xs text-muted-foreground">
            Action
          </Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
              <SelectItem value="replaced">Replaced</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Label className="mb-1 block text-xs text-muted-foreground">
            From
          </Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="w-44">
          <Label className="mb-1 block text-xs text-muted-foreground">
            To
          </Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No activity found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.logId}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatTimestamp(entry.timestamp)}
                  </TableCell>
                  <TableCell>{entry.user?.name ?? entry.user?.email ?? entry.userId}</TableCell>
                  <TableCell>{entry.entity}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.entity === "Partner" ? (
                      <Link
                        href={`/dashboard/partners/${entry.entityId}`}
                        className="text-primary hover:underline"
                      >
                        {entry.entityId.slice(0, 8)}...
                      </Link>
                    ) : entry.entity === "Asset" ? (
                      <Link
                        href={`/dashboard/assets/${entry.entityId}`}
                        className="text-primary hover:underline"
                      >
                        {entry.entityId.slice(0, 8)}...
                      </Link>
                    ) : (
                      <>{entry.entityId.slice(0, 8)}...</>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {entry.action}
                    </span>
                  </TableCell>
                  <TableCell
                    className="max-w-xs truncate text-xs text-muted-foreground"
                    title={
                      entry.details ? JSON.stringify(entry.details) : undefined
                    }
                  >
                    {formatDetails(entry.details)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
