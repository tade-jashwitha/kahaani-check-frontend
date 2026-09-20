import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E3E8E5] bg-[#FFFFFF] p-8 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F3F0] text-[#147D72]">
        {icon}
      </div>

      <h3 className="mt-4 text-base font-semibold text-[#173B38]">
        {title}
      </h3>

      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#6B7D79]">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}