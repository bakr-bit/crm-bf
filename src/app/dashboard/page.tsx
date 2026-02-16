"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Handshake, Globe, AlertCircle } from "lucide-react";

// ---------- types ----------

interface DashboardStats {
  totalPartners: number;
  liveDeals: number;
  totalAssets: number;
  pipelineDeals: number;
}

interface DashboardData {
  stats: DashboardStats;
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
      </div>
    );
  }

  const stats = data?.stats;

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
      label: "Live Deals",
      value: stats?.liveDeals ?? 0,
      icon: <Handshake className="size-5 text-muted-foreground" />,
    },
    {
      label: "Assets",
      value: stats?.totalAssets ?? 0,
      icon: <Globe className="size-5 text-muted-foreground" />,
    },
    {
      label: "In Pipeline",
      value: stats?.pipelineDeals ?? 0,
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

    </div>
  );
}
