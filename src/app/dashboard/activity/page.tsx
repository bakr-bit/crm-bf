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

// ---------- helpers ----------

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  ARCHIVE: "Archived",
  CREATE_REPLACEMENT: "Replacement created",
  ENDED_BY_REPLACEMENT: "Ended (replaced)",
  ENDED_BY_SCAN: "Ended (scan)",
  CREATE_FROM_SCAN: "Created from scan",
};

function describeActivity(entry: AuditLogEntry): string {
  const user = entry.user?.name ?? entry.user?.email ?? "Unknown";
  const label = ACTION_LABELS[entry.action] ?? entry.action;
  const entity = entry.entity.toLowerCase();

  // Pull a meaningful name from details if available
  const details = entry.details;
  const name =
    (details?.name as string) ??
    (details?.brandName as string) ??
    (details?.partnerName as string) ??
    null;

  switch (entry.action) {
    case "CREATE":
      return `${user} created a new ${entity}${name ? ` "${name}"` : ""}`;
    case "UPDATE":
      return `${user} updated ${entity}${name ? ` "${name}"` : ""}`;
    case "ARCHIVE":
      return `${user} archived ${entity}${name ? ` "${name}"` : ""}`;
    case "CREATE_REPLACEMENT":
      return `${user} created a replacement deal`;
    case "ENDED_BY_REPLACEMENT":
      return `${user} ended deal (replaced by new deal)`;
    case "ENDED_BY_SCAN":
      return `${user} ended deal based on scan results`;
    case "CREATE_FROM_SCAN":
      return `${user} created deal from scan match`;
    default:
      return `${user} — ${label} on ${entity}`;
  }
}

function entityLink(entry: AuditLogEntry): string | null {
  switch (entry.entity) {
    case "Partner":
      return `/dashboard/partners/${entry.entityId}`;
    case "Asset":
      return `/dashboard/assets/${entry.entityId}`;
    case "Deal":
      return `/dashboard/deals/${entry.entityId}`;
    default:
      return null;
  }
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
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const url = `/api/audit-log?${params.toString()}`;

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
  }, [entityFilter, actionFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    setLoading(true);
    fetchAuditLog();
  }, [fetchAuditLog]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [entityFilter, actionFilter, dateFrom, dateTo]);

  function formatTimestamp(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
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
            Entity
          </Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Deal">Deals</SelectItem>
              <SelectItem value="Partner">Partners</SelectItem>
              <SelectItem value="Brand">Brands</SelectItem>
              <SelectItem value="Asset">Assets</SelectItem>
              <SelectItem value="Position">Positions</SelectItem>
              <SelectItem value="Contact">Contacts</SelectItem>
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
              <SelectItem value="CREATE">Created</SelectItem>
              <SelectItem value="UPDATE">Updated</SelectItem>
              <SelectItem value="ARCHIVE">Archived</SelectItem>
              <SelectItem value="CREATE_REPLACEMENT">Replacement</SelectItem>
              <SelectItem value="ENDED_BY_REPLACEMENT">Ended (replaced)</SelectItem>
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
              <TableHead>Date</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No activity found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const link = entityLink(entry);
                return (
                  <TableRow key={entry.logId}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {describeActivity(entry)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium">
                        {entry.entity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      {link && (
                        <Link
                          href={link}
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
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
