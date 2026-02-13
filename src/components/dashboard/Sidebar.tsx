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
  Activity,
  Settings,
  Shield,
  ClipboardList,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Partners", href: "/dashboard/partners", icon: Users },
  { name: "Intake", href: "/dashboard/intake", icon: ClipboardList },
  { name: "Assets", href: "/dashboard/assets", icon: Globe },
  { name: "Deals", href: "/dashboard/deals", icon: Handshake },
  { name: "Deal Finder", href: "/dashboard/deal-finder", icon: Search },
  { name: "Activity Log", href: "/dashboard/activity", icon: Activity },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const items = isAdmin
    ? [...navigation, { name: "Admin", href: "/dashboard/admin", icon: Shield }]
    : navigation;

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">CRM System</h1>
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
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
