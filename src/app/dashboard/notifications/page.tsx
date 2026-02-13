"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";

interface Notification {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

const ENTITY_ROUTES: Record<string, string> = {
  Deal: "/dashboard/deals",
  Partner: "/dashboard/partners",
  Asset: "/dashboard/assets",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter === "unread") params.set("unreadOnly", "true");
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  }

  async function markAsRead(notificationId: string) {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    fetchNotifications();
  }

  function getEntityLink(n: Notification): string | null {
    if (n.entityType && n.entityId && ENTITY_ROUTES[n.entityType]) {
      return `${ENTITY_ROUTES[n.entityType]}/${n.entityId}`;
    }
    return null;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 text-sm",
                filter === "all"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-3 py-1.5 text-sm",
                filter === "unread"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              )}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-zinc-400">
            Loading...
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <Bell className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No notifications</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {filter === "unread"
                ? "You have no unread notifications."
                : "You have no notifications yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const link = getEntityLink(n);
            return (
              <div
                key={n.notificationId}
                className={cn(
                  "flex items-start justify-between rounded-lg border bg-white p-4",
                  !n.isRead && "border-blue-200 bg-blue-50/30"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <p className="text-sm font-medium text-zinc-900">
                      {n.title}
                    </p>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">{n.message}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {formatDate(n.createdAt)}
                  </p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-2">
                  {link && (
                    <a
                      href={link}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View
                    </a>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={() => markAsRead(n.notificationId)}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
