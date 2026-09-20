import React from "react";
import Sidebar from "@/app/components/Sidebar";
import MobileNav from "@/app/components/MobileNav";
import BottomNav from "@/app/components/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#173B38]">
      {/* MOBILE TOP BAR (logo + settings gear) */}
      <MobileNav />

      {/* DESKTOP FIXED SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT — left-padded on desktop, bottom-padded for BottomNav on mobile */}
      <div className="min-h-screen pb-20 lg:pb-0 lg:pl-[240px]">
        {children}
      </div>

      {/* MOBILE BOTTOM TAB BAR */}
      <BottomNav />
    </div>
  );
}