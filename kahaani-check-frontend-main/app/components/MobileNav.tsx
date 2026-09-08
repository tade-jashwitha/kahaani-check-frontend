"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Home, Phone, TrendingUp, Settings } from "lucide-react";
import KahaaniLogo from "./KahaaniLogo";

const navItems = [
  { href: "/dashboard", label: "My Family", icon: Home },
  { href: "/dashboard/elders/[id]/checkins", label: "Check-ins", icon: Phone },
  { href: "/dashboard/elders/[id]/trends", label: "Trends", icon: TrendingUp },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface MobileNavProps {
  activeElderId?: string;
}

export default function MobileNav({ activeElderId }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const resolveHref = (href: string) =>
    activeElderId ? href.replace("[id]", activeElderId) : "/dashboard";

  return (
    <>
      {/* Mobile header */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4 lg:hidden">
        <Link href="/dashboard" onClick={() => setOpen(false)}>
          <KahaaniLogo size="sm" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-primary-dark"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="border-b border-border bg-surface px-5 py-4 lg:hidden">
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={resolveHref(href)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-text-secondary hover:bg-primary-light hover:text-primary-dark transition-colors"
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}