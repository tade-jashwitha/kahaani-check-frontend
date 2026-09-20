"use client";

/**
 * MobileTopBar — slim top bar for mobile/tablet
 *
 * Shows the brand logo on the left and a Settings gear icon on the right.
 * Navigation tabs are handled by BottomNav.
 * Hidden on desktop (lg:hidden) — desktop uses the Sidebar.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Settings } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  // Show a human-readable page title based on the current route
  function getPageTitle(): string {
    if (pathname === "/dashboard") return "Home";
    if (pathname.startsWith("/dashboard/elders/") && pathname.includes("/checkins/")) return "Check-in";
    if (pathname.startsWith("/dashboard/elders/") && pathname.endsWith("/checkins")) return "Check-ins";
    if (pathname.startsWith("/dashboard/elders/") && pathname.endsWith("/trends")) return "Trends";
    if (pathname.startsWith("/dashboard/elders/new")) return "Add Elder";
    if (pathname.startsWith("/dashboard/elders/")) return "Elder Profile";
    if (pathname.startsWith("/dashboard/checkins")) return "Check-ins";
    if (pathname.startsWith("/dashboard/insights")) return "Insights";
    if (pathname.startsWith("/dashboard/alerts")) return "Alerts";
    if (pathname.startsWith("/dashboard/settings")) return "Settings";
    return "Kahaani-Check";
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#E3E8E5] bg-white px-4 lg:hidden">
      {/* LOGO */}
      <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Go to home">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F3F0]">
          <Heart size={16} className="fill-[#147D72] text-[#147D72]" />
        </div>
        <span className="text-sm font-bold tracking-tight text-[#173B38]">
          {getPageTitle()}
        </span>
      </Link>

      {/* SETTINGS GEAR — top-right */}
      <Link
        href="/dashboard/settings"
        aria-label="Settings"
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
          pathname === "/dashboard/settings"
            ? "bg-[#E8F3F0] text-[#147D72]"
            : "text-[#6B7D79] hover:bg-[#F8F6F0]"
        }`}
      >
        <Settings size={18} />
      </Link>
    </header>
  );
}