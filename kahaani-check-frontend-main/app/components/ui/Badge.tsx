import React from "react";

export type BadgeVariant = "teal" | "orange" | "green" | "gray" | "red";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  teal: "bg-[#E8F3F0] text-[#147D72] border-[#C8DFD9]",
  orange: "bg-[#F8EBDD] text-[#A86A43] border-[#ECD5BD]",
  green: "bg-[#DDF4E8] text-[#198754] border-[#BDE7D0]",
  gray: "bg-[#F8F6F0] text-[#6B7D79] border-[#E3E8E5]",
  red: "bg-[#FBEAE8] text-[#C94A4A] border-[#F2C5C0]",
};

export default function Badge({
  children,
  variant = "teal",
  icon,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${VARIANT_STYLES[variant]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
