import React from "react";

interface SettingsRowProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function SettingsRow({
  icon,
  title,
  description,
  action,
  onClick,
  className = "",
}: SettingsRowProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between py-4 first:pt-0 last:pb-0 ${
        onClick ? "cursor-pointer transition hover:opacity-80" : ""
      } ${className}`}
    >
      <div className="flex items-start gap-3.5 pr-4">
        {icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F3F0] text-[#147D72]">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-[#173B38]">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-[#6B7D79]">{description}</p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
