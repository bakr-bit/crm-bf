"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { DealReplacementDialog } from "@/components/dashboard/DealReplacementDialog";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { GeoFlag } from "@/components/dashboard/GeoFlag";

// ---------- types ----------

interface DealUser {
  id: string;
  name: string | null;
  email: string;
}

interface LinkedDeal {
  dealId: string;
  partner: { name: string };
  brand: { name: string };
  status: string;
}

interface DealDetail {
  dealId: string;
  partnerId: string;
  brandId: string;
  assetId: string;
  positionId: string;
  affiliateLink: string | null;
  status: string;
  isDirect: boolean;
  geo: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  partner: { partnerId: string; name: string };
  brand: { brandId: string; name: string };
  asset: { assetId: string; name: string };
  position: { positionId: string; name: string };
  createdBy: DealUser | null;
  updatedBy: DealUser | null;
  replacedDeal: LinkedDeal | null;
  replacedBy: LinkedDeal | null;
}

interface AuditEntry {
  id: string;
  userId: string;
  entity: string;
  entityId: string;
  action: string;
  details: Record<string, unknown> | null;
  timestamp: string;
  user: { id: string; name: string | null; email: string };
}

interface AuditResponse {
  data: AuditEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ReplacementDealInfo {
  dealId: string;
  assetId: string;
  positionId: string;
  assetName: string;
  positionName: string;
}

// ---------- component ----------

export default function DealDetailPage() {
  const params = useParams<{ dealId: string }>();
  const dealId = params.dealId;

  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [ending, setEnding] = useState(false);

  // Replacement dialog
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [replacementDeal, setReplacementDeal] =
    useState<ReplacementDealInfo | null>(null);

  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      if (!res.ok) throw new Error("Failed to fetch deal");
      const json: DealDetail = await res.json();
      setDeal(json);
    } catch (err) {
      console.error("Deal detail fetch error:", err);
      toast.error("Failed to load deal.");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(
        `/api/audit-log?entity=Deal&entityId=${dealId}&limit=100`
      );
      if (!res.ok) throw new Error("Failed to fetch audit log");
      const json: AuditResponse = await res.json();
      setAuditLog(json.data);
    } catch (err) {
      console.error("Audit log fetch error:", err);
    } finally {
      setAuditLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  // ---------- actions ----------

  async function handleEndDeal() {
    if (!deal) return;
    setEnding(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Ended" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to end deal.");
      }
      toast.success("Deal ended.");
      fetchDeal();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setEnding(false);
    }
  }

  function handleReplaceDeal() {
    if (!deal) return;
    setReplacementDeal({
      dealId: deal.dealId,
      assetId: deal.assetId,
      positionId: deal.positionId,
      assetName: deal.asset.name,
      positionName: deal.position.name,
    });
    setReplacementDialogOpen(true);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  }

  function formatTimestamp(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  }

  function renderDetails(details: Record<string, unknown> | null) {
    if (!details) return "-";
    return Object.entries(details).map(([key, value]) => (
      <div key={key} className="text-xs">
        <span className="font-medium">{key}:</span>{" "}
        <span className="text-muted-foreground">
          {typeof value === "object" ? JSON.stringify(value) : String(value)}
        </span>
      </div>
    ));
  }

  // ---------- loading / not found ----------

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-12 w-64 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Deal not found.</p>
        <Link
          href="/dashboard/deals"
          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Deals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back link */}
      <Link
        href="/dashboard/deals"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Deals
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {deal.brand.name} on {deal.asset.name}
          </h1>
          <StatusBadge status={deal.status} variant="deal" />
        </div>
        {deal.status === "Active" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleEndDeal}
              disabled={ending}
            >
              {ending ? "Ending..." : "End Deal"}
            </Button>
            <Button onClick={handleReplaceDeal}>Replace Deal</Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="replacement">Replacement Chain</TabsTrigger>
          <TabsTrigger value="history" onClick={fetchAuditLog}>
            History
          </TabsTrigger>
        </TabsList>

        {/* ---- Overview Tab ---- */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Partner
                  </dt>
                  <dd className="text-sm">
                    <Link
                      href={`/dashboard/partners/${deal.partnerId}`}
                      className="text-primary hover:underline"
                    >
                      {deal.partner.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Brand
                  </dt>
                  <dd className="text-sm">{deal.brand.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Asset
                  </dt>
                  <dd className="text-sm">
                    <Link
                      href={`/dashboard/assets/${deal.assetId}`}
                      className="text-primary hover:underline"
                    >
                      {deal.asset.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Position
                  </dt>
                  <dd className="text-sm">{deal.position.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Affiliate Link
                  </dt>
                  <dd className="truncate font-mono text-xs">
                    {deal.affiliateLink ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Status
                  </dt>
                  <dd className="text-sm">{deal.status}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Direct Deal
                  </dt>
                  <dd className="text-sm">{deal.isDirect ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Geo
                  </dt>
                  <dd className="text-sm">
                    <GeoFlag geo={deal.geo} />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Start Date
                  </dt>
                  <dd className="text-sm">{formatDate(deal.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    End Date
                  </dt>
                  <dd className="text-sm">{formatDate(deal.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Created by
                  </dt>
                  <dd className="text-sm">
                    {deal.createdBy?.name ?? deal.createdBy?.email ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Updated by
                  </dt>
                  <dd className="text-sm">
                    {deal.updatedBy?.name ?? deal.updatedBy?.email ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Created at
                  </dt>
                  <dd className="text-sm">{formatTimestamp(deal.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Updated at
                  </dt>
                  <dd className="text-sm">{formatTimestamp(deal.updatedAt)}</dd>
                </div>
              </dl>

              {/* Notes */}
              <div className="mt-6 border-t pt-4">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Notes
                </h3>
                {deal.notes ? (
                  <p className="whitespace-pre-wrap text-sm">{deal.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Replacement Chain Tab ---- */}
        <TabsContent value="replacement">
          <div className="space-y-4">
            {!deal.replacedDeal && !deal.replacedBy ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No replacement chain for this deal.
                </CardContent>
              </Card>
            ) : (
              <>
                {deal.replacedDeal && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Replaced (Previous Deal)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">
                            Partner
                          </dt>
                          <dd className="text-sm">
                            {deal.replacedDeal.partner.name}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">
                            Brand
                          </dt>
                          <dd className="text-sm">
                            {deal.replacedDeal.brand.name}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">
                            Status
                          </dt>
                          <dd>
                            <StatusBadge
                              status={deal.replacedDeal.status}
                              variant="deal"
                            />
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4">
                        <Link
                          href={`/dashboard/deals/${deal.replacedDeal.dealId}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View deal
                          <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {deal.replacedBy && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Replaced By (New Deal)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">
                            Partner
                          </dt>
                          <dd className="text-sm">
                            {deal.replacedBy.partner.name}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">
                            Brand
                          </dt>
                          <dd className="text-sm">
                            {deal.replacedBy.brand.name}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">
                            Status
                          </dt>
                          <dd>
                            <StatusBadge
                              status={deal.replacedBy.status}
                              variant="deal"
                            />
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4">
                        <Link
                          href={`/dashboard/deals/${deal.replacedBy.dealId}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View deal
                          <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* ---- History Tab ---- */}
        <TabsContent value="history">
          {auditLoading ? (
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          ) : auditLog.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No audit history for this deal.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.user?.name ?? entry.user?.email ?? "-"}
                      </TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {entry.action}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {renderDetails(entry.details)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Replacement Dialog */}
      <DealReplacementDialog
        open={replacementDialogOpen}
        onOpenChange={setReplacementDialogOpen}
        deal={replacementDeal}
        onSuccess={fetchDeal}
      />
    </div>
  );
}
