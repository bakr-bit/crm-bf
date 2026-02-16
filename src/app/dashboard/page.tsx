"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, Globe } from "lucide-react";

// ---------- types ----------

interface DashboardStats {
  unassignedPartners: number;
  missingInfoPartners: number;
  assetsAwaitingPositions: number;
}

// ---------- component ----------

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const json = await res.json();
        setStats(json.stats);
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
      </div>
    );
  }

  const cards: {
    label: string;
    value: number;
    icon: React.ReactNode;
    href: string;
    description: string;
  }[] = [
    {
      label: "Unassigned Partners",
      value: stats?.unassignedPartners ?? 0,
      icon: <Users className="size-5 text-muted-foreground" />,
      href: "/dashboard/partners",
      description: "Partners with no account manager",
    },
    {
      label: "Partners Missing Info",
      value: stats?.missingInfoPartners ?? 0,
      icon: <AlertTriangle className="size-5 text-muted-foreground" />,
      href: "/dashboard/partners",
      description: "Assigned to you, missing contract/license/banking",
    },
    {
      label: "Assets Awaiting Positions",
      value: stats?.assetsAwaitingPositions ?? 0,
      icon: <Globe className="size-5 text-muted-foreground" />,
      href: "/dashboard/assets",
      description: "Assets with pages that have no positions",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
