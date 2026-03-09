"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Globe,
  Handshake,
  Search,
  Star,
  Activity,
  Settings,
  Shield,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect, createContext, useContext } from "react";

const COLLAPSED_KEY = "sidebar-collapsed";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Partners", href: "/dashboard/partners", icon: Users },
  { name: "Sign Up Links", href: "/dashboard/intake", icon: ClipboardList },
  { name: "Assets", href: "/dashboard/assets", icon: Globe },
  { name: "Deals", href: "/dashboard/deals", icon: Handshake },
  { name: "Brands", href: "/dashboard/deal-finder", icon: Search },
  { name: "Wishlist", href: "/dashboard/wishlist", icon: Star },
  { name: "Activity Log", href: "/dashboard/activity", icon: Activity },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const items = isAdmin
    ? [...navigation, { name: "Admin", href: "/dashboard/admin", icon: Shield }]
    : navigation;

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-zinc-900 transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <h1 className="text-xl font-bold text-white truncate px-2">CRM System</h1>
        )}
        <button
          onClick={toggle}
          className={cn(
            "rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors",
            collapsed && "mx-auto"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
