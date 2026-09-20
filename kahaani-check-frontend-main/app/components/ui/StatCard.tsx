import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    text: string;
    positive?: boolean;
  };
  className?: string;
}

export default function StatCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`flex items-start justify-between rounded-2xl border border-[#E3E8E5] bg-[#FFFFFF] p-5 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)] ${className}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#6B7D79]">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#173B38]">
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-[#8F9E9B]">{subtitle}</p>
        )}
        {trend && (
          <p
            className={`mt-1.5 text-xs font-semibold ${
              trend.positive ? "text-[#198754]" : "text-[#A86A43]"
            }`}
          >
            {trend.text}
          </p>
        )}
      </div>

      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F3F0] text-[#147D72]">
          {icon}
        </div>
      )}
    </div>
  );
}
