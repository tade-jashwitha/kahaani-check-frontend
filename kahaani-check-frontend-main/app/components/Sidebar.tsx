"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Home, Phone, TrendingUp, Settings } from "lucide-react";
import KahaaniLogo from "./KahaaniLogo";

const navItems = [
  { href: "/dashboard", label: "My Family", icon: Home, matchExact: true },
  { href: "/dashboard/elders/[id]/checkins", label: "Check-ins", icon: Phone },
  { href: "/dashboard/elders/[id]/trends", label: "Trends", icon: TrendingUp },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const elderId = params?.id as string | undefined;

  const resolveHref = (href: string) =>
    elderId ? href.replace("[id]", elderId) : "/dashboard";

  const isActive = (href: string, matchExact?: boolean) => {
    const resolved = resolveHref(href);
    return matchExact ? pathname === resolved : pathname.startsWith(resolved);
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-border bg-surface min-h-screen px-4 py-6">
      <div className="px-2 mb-8">
        <KahaaniLogo size="md" />
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon, matchExact }) => {
          const active = isActive(href, matchExact);
          const disabled = href.includes("[id]") && !elderId;

          return (
            <Link
              key={label}
              href={disabled ? "#" : resolveHref(href)}
              aria-disabled={disabled}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary-light text-primary-dark"
                  : disabled
                  ? "text-text-muted cursor-not-allowed opacity-50"
                  : "text-text-secondary hover:bg-primary-light hover:text-primary-dark"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-6 border-t border-border">
        <p className="text-xs text-text-muted leading-relaxed">
          Kahaani-Check is not a diagnostic tool. It highlights changes worth
          discussing with a healthcare professional.
        </p>
      </div>
    </aside>
  );
}