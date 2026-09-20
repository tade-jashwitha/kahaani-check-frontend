import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  actionButton?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
  actionButton,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between ${className}`}>
      <div>
        <h2 className="text-[18px] font-semibold text-[#173B38] sm:text-[20px]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[#6B7D79]">{subtitle}</p>
        )}
      </div>

      {actionButton && <div>{actionButton}</div>}

      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#147D72] transition hover:text-[#105E57]"
        >
          {actionLabel}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}
