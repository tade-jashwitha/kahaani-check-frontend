"use client";

/**
 * BottomNav — persistent tab bar
 *
 * Shown on all screen sizes below the main content.
 * Desktop uses the Sidebar instead (lg:hidden on this component).
 * Tabs: Home · Elders · Insights · Alerts · Check-ins
 * Settings is accessed via the top-right gear icon.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  TrendingUp,
  Bell,
  ClipboardCheck,
} from "lucide-react";
import { useAlerts } from "@/app/features/alerts/hooks";

interface NavTab {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useAlerts();

  const TABS: NavTab[] = [
    { label: "Home",      href: "/dashboard",             icon: Home,          exact: true },
    { label: "Elders",    href: "/dashboard/elders",      icon: Users },
    { label: "Insights",  href: "/dashboard/insights",    icon: TrendingUp },
    { label: "Alerts",    href: "/dashboard/alerts",      icon: Bell,          badge: unreadCount },
    { label: "Check-ins", href: "/dashboard/checkins",    icon: ClipboardCheck },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-[#E3E8E5] bg-white lg:hidden"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
              isActive
                ? "text-[#147D72]"
                : "text-[#8F9E9B] hover:text-[#173B38]"
            }`}
          >
            {/* Active indicator bar */}
            {isActive && (
              <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b-full bg-[#147D72]" />
            )}

            <div className="relative">
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? "text-[#147D72]" : "text-[#8F9E9B]"}
              />
              {/* Badge */}
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#A86A43] px-0.5 text-[9px] font-bold text-white">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </div>

            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
