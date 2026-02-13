"use client";

import { useState, useEffect } from "react";
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
import { ScanItemActionDialog } from "@/components/dashboard/ScanItemActionDialog";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRightLeft,
} from "lucide-react";

interface Asset {
  assetId: string;
  name: string;
  assetDomain: string | null;
}

interface ScanItem {
  itemId: string;
  type: "Verified" | "NewUnmatched" | "Missing" | "Replacement";
  action: "Pending" | "Ignored" | "Confirmed";
  foundUrl: string | null;
  foundAnchor: string | null;
  matchedDealId: string | null;
  matchedDeal?: {
    dealId: string;
    partner: { name: string };
    brand: { name: string };
    position: { name: string };
  } | null;
  matchedBrandId: string | null;
  matchedBrand?: {
    brandId: string;
    partnerId: string;
    name: string;
    partner: { partnerId: string; name: string };
  } | null;
  confidence: number | null;
  notes: string | null;
}

interface ScanResult {
  scanId: string;
  assetId: string;
  scannedUrl: string;
  scannedAt: string;
  totalLinks: number;
  items: ScanItem[];
  asset?: { name: string; assetDomain: string | null };
}

interface ScanHistoryItem {
  scanId: string;
  scannedAt: string;
  asset: { name: string; assetDomain: string | null };
  _count: { items: number };
}

const TYPE_CONFIG = {
  Verified: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
    label: "Verified",
  },
  NewUnmatched: {
    color: "bg-blue-100 text-blue-800",
    icon: AlertTriangle,
    label: "New",
  },
  Missing: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "Missing",
  },
  Replacement: {
    color: "bg-yellow-100 text-yellow-800",
    icon: ArrowRightLeft,
    label: "Replacement",
  },
};

export default function DealFinderPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [actionItem, setActionItem] = useState<ScanItem | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  // Load assets
  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((data: Asset[]) => {
        setAssets(data.filter((a) => a.assetDomain));
      })
      .catch(() => {});
  }, []);

  // Load scan history when asset changes
  useEffect(() => {
    if (selectedAsset) {
      fetch(`/api/deal-finder/scans?assetId=${selectedAsset}`)
        .then((r) => r.json())
        .then((data: ScanHistoryItem[]) => setScanHistory(data))
        .catch(() => {});
    }
  }, [selectedAsset, scanResult]);

  async function handleScan() {
    if (!selectedAsset) {
      toast.error("Please select an asset");
      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      const res = await fetch("/api/deal-finder/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: selectedAsset }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Scan failed");
      }

      const result = await res.json();
      setScanResult(result);
      toast.success("Scan completed");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(message);
    } finally {
      setScanning(false);
    }
  }

  async function loadScan(scanId: string) {
    try {
      const res = await fetch(`/api/deal-finder/scans?scanId=${scanId}`);
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      }
    } catch {
      toast.error("Failed to load scan");
    }
  }

  async function handleIgnore(itemId: string) {
    try {
      const res = await fetch("/api/deal-finder/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "Ignored" }),
      });
      if (!res.ok) throw new Error("Failed to ignore item");
      toast.success("Item ignored");
      // Refresh the scan
      if (scanResult) loadScan(scanResult.scanId);
    } catch {
      toast.error("Failed to ignore item");
    }
  }

  async function handleEndDeal(itemId: string) {
    try {
      const res = await fetch("/api/deal-finder/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "Confirmed" }),
      });
      if (!res.ok) throw new Error("Failed to end deal");
      toast.success("Deal ended");
      if (scanResult) loadScan(scanResult.scanId);
    } catch {
      toast.error("Failed to end deal");
    }
  }

  async function handleConfirm(itemId: string) {
    try {
      const res = await fetch("/api/deal-finder/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "Confirmed" }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
      toast.success("Confirmed");
      if (scanResult) loadScan(scanResult.scanId);
    } catch {
      toast.error("Failed to confirm item");
    }
  }

  const summary = scanResult
    ? {
        verified: scanResult.items.filter((i) => i.type === "Verified").length,
        newUnmatched: scanResult.items.filter(
          (i) => i.type === "NewUnmatched"
        ).length,
        missing: scanResult.items.filter((i) => i.type === "Missing").length,
        replacements: scanResult.items.filter(
          (i) => i.type === "Replacement"
        ).length,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Deal Finder</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Scan asset websites for affiliate links, detect new, missing, and
          replaced deals
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select an asset to scan" />
          </SelectTrigger>
          <SelectContent>
            {assets.map((a) => (
              <SelectItem key={a.assetId} value={a.assetId}>
                {a.name} ({a.assetDomain})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleScan} disabled={scanning || !selectedAsset}>
          {scanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Scan Now
            </>
          )}
        </Button>

        {scanHistory.length > 0 && (
          <Select onValueChange={loadScan}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Load previous scan" />
            </SelectTrigger>
            <SelectContent>
              {scanHistory.map((s) => (
                <SelectItem key={s.scanId} value={s.scanId}>
                  {new Date(s.scannedAt).toLocaleDateString()}{" "}
                  {new Date(s.scannedAt).toLocaleTimeString()} (
                  {s._count.items} items)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-zinc-500">Verified</div>
              <div className="mt-1 text-2xl font-bold text-green-600">
                {summary.verified}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-zinc-500">New Links</div>
              <div className="mt-1 text-2xl font-bold text-blue-600">
                {summary.newUnmatched}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-zinc-500">Missing</div>
              <div className="mt-1 text-2xl font-bold text-red-600">
                {summary.missing}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-zinc-500">Replacements</div>
              <div className="mt-1 text-2xl font-bold text-yellow-600">
                {summary.replacements}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scan info */}
      {scanResult && (
        <p className="text-sm text-zinc-500">
          Scanned {scanResult.scannedUrl} — {scanResult.totalLinks} total links
          found, {scanResult.items.length} classified items
        </p>
      )}

      {/* Results Table */}
      {scanResult && scanResult.items.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Type</TableHead>
                <TableHead>Found URL</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Matched Deal</TableHead>
                <TableHead className="w-24">Confidence</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-36">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scanResult.items.map((item) => {
                const config = TYPE_CONFIG[item.type];
                const Icon = config.icon;
                return (
                  <TableRow key={item.itemId}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={config.color}
                      >
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs">
                      {item.foundUrl ? (
                        <span title={item.foundUrl}>{item.foundUrl}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.matchedBrand?.name ??
                        item.matchedDeal?.brand.name ?? (
                          <span className="text-zinc-400">Unknown</span>
                        )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.matchedDeal ? (
                        <span>
                          {item.matchedDeal.partner.name} /{" "}
                          {item.matchedDeal.position.name}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.confidence !== null
                        ? `${Math.round(item.confidence * 100)}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-zinc-500">
                      {item.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      {item.action !== "Pending" ? (
                        <Badge
                          variant="outline"
                          className={
                            item.action === "Confirmed"
                              ? "border-green-200 text-green-700"
                              : "border-zinc-200 text-zinc-500"
                          }
                        >
                          {item.action}
                        </Badge>
                      ) : (
                        <div className="flex gap-1">
                          {item.type === "NewUnmatched" && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs"
                              onClick={() => {
                                setActionItem(item);
                                setActionDialogOpen(true);
                              }}
                            >
                              Create Deal
                            </Button>
                          )}
                          {item.type === "Missing" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => handleEndDeal(item.itemId)}
                            >
                              End Deal
                            </Button>
                          )}
                          {(item.type === "Verified" ||
                            item.type === "Replacement") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleConfirm(item.itemId)}
                            >
                              Confirm
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-zinc-400"
                            onClick={() => handleIgnore(item.itemId)}
                          >
                            Ignore
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : scanResult ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">No affiliate links found</h3>
            <p className="mt-1 text-sm text-zinc-500">
              The scan did not detect any affiliate links on this page
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <Search className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium">
              Select an asset and scan
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Choose an asset with a domain to scan for affiliate links
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Deal Dialog */}
      <ScanItemActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        item={actionItem}
        assetId={selectedAsset}
        onSuccess={() => {
          if (scanResult) loadScan(scanResult.scanId);
        }}
      />
    </div>
  );
}
