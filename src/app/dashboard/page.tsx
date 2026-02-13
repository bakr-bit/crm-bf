"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Handshake, Globe, AlertCircle } from "lucide-react";
import Link from "next/link";

// ---------- types ----------

interface DashboardStats {
  totalPartners: number;
  activeDeals: number;
  totalAssets: number;
  pendingValidationDeals: number;
}

interface AuditLogEntry {
  logId: string;
  timestamp: string;
  userId: string;
  user: { id: string; name: string | null; email: string } | null;
  entity: string;
  entityId: string;
  action: string;
  details: Record<string, unknown> | null;
}

interface DashboardData {
  stats: DashboardStats;
  recentAuditLogs: AuditLogEntry[];
}

// ---------- helpers ----------

const ACTION_LABELS: Record<string, string> = {
  CREATE: "created",
  UPDATE: "updated",
  ARCHIVE: "archived",
  CREATE_REPLACEMENT: "created replacement for",
  ENDED_BY_REPLACEMENT: "ended (replaced)",
  ENDED_BY_SCAN: "ended (scan)",
  CREATE_FROM_SCAN: "created from scan",
};

function describeActivity(entry: AuditLogEntry): string {
  const verb = ACTION_LABELS[entry.action] ?? entry.action.toLowerCase();
  const entity = entry.entity.toLowerCase();
  const details = entry.details;
  const name =
    (details?.name as string) ??
    (details?.brandName as string) ??
    (details?.partnerName as string) ??
    null;

  return `${verb} ${entity}${name ? ` "${name}"` : ""}`;
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

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------- component ----------

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const json: DashboardData = await res.json();
        setData(json);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const stats = data?.stats;
  const logs = data?.recentAuditLogs ?? [];

  const cards: {
    label: string;
    value: number;
    icon: React.ReactNode;
  }[] = [
    {
      label: "Partners",
      value: stats?.totalPartners ?? 0,
      icon: <Users className="size-5 text-muted-foreground" />,
    },
    {
      label: "Active Deals",
      value: stats?.activeDeals ?? 0,
      icon: <Handshake className="size-5 text-muted-foreground" />,
    },
    {
      label: "Assets",
      value: stats?.totalAssets ?? 0,
      icon: <Globe className="size-5 text-muted-foreground" />,
    },
    {
      label: "Pending Validation",
      value: stats?.pendingValidationDeals ?? 0,
      icon: <AlertCircle className="size-5 text-muted-foreground" />,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Link
            href="/dashboard/activity"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {logs.map((log) => {
              const link = entityLink(log);
              return (
                <li
                  key={log.logId}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <span className="shrink-0 w-16 text-xs text-muted-foreground">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">
                      {log.user?.name ?? log.user?.email ?? "Unknown"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {describeActivity(log)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium">
                    {log.entity}
                  </span>
                  {link && (
                    <Link
                      href={link}
                      className="shrink-0 text-xs text-primary hover:underline"
                    >
                      View
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
