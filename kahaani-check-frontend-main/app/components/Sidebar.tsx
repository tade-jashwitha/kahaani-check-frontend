"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  ClipboardCheck,
  TrendingUp,
  Bell,
  Heart,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useAlerts } from "@/app/features/alerts/hooks";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { unreadCount } = useAlerts();

  const NAV_ITEMS: NavItem[] = [
    { label: "Home",      href: "/dashboard",           icon: Home,          exact: true },
    { label: "Elders",    href: "/dashboard/elders",    icon: Users },
    { label: "Check-ins", href: "/dashboard/checkins",  icon: ClipboardCheck },
    { label: "Insights",  href: "/dashboard/insights",  icon: TrendingUp },
    { label: "Alerts",    href: "/dashboard/alerts",    icon: Bell,          badge: unreadCount },
  ];

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[240px] flex-col justify-between border-r border-[#E3E8E5] bg-[#FFFFFF] lg:flex print:!hidden">
      <div>
        {/* BRAND */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F3F0] text-[#147D72]">
            <Heart size={20} className="fill-[#147D72] text-[#147D72]" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-[#173B38]">
              Kahaani-Check
            </span>
            <p className="text-[11px] font-medium text-[#6B7D79]">
              Family Voice Care
            </p>
          </div>
        </div>

        {/* NAV ITEMS */}
        <nav className="mt-2 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#E8F3F0] text-[#147D72] font-semibold"
                    : "text-[#6B7D79] hover:bg-[#F8F6F0] hover:text-[#173B38]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    size={18}
                    className={isActive ? "text-[#147D72]" : "text-[#8F9E9B]"}
                  />
                  {item.label}
                </span>

                {/* Alert badge */}
                {item.badge != null && item.badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#A86A43] px-1 text-[10px] font-bold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* FOOTER: Settings + caregiver info */}
      <div className="border-t border-[#E3E8E5] p-4 space-y-2">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
            pathname === "/dashboard/settings"
              ? "bg-[#E8F3F0] text-[#147D72] font-semibold"
              : "text-[#6B7D79] hover:bg-[#F8F6F0] hover:text-[#173B38]"
          }`}
        >
          <Settings
            size={18}
            className={pathname === "/dashboard/settings" ? "text-[#147D72]" : "text-[#8F9E9B]"}
          />
          Settings
        </Link>

        <div className="flex items-center gap-3 rounded-xl bg-[#F8F6F0] p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#147D72] text-xs font-semibold text-white">
            CG
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#173B38]">
              Caregiver Portal
            </p>
            <p className="truncate text-[11px] text-[#6B7D79]">
              Active Monitoring
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}