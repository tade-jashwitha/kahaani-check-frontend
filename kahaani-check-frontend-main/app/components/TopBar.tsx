"use client";

import { Bell } from "lucide-react";
import Avatar from "./ui/Avatar";

interface TopBarProps {
  title: string;
  caregiverName?: string;
  caregiverAvatarUrl?: string;
  notificationCount?: number;
}

export default function TopBar({
  title,
  caregiverName = "Caregiver",
  caregiverAvatarUrl,
  notificationCount = 0,
}: TopBarProps) {
  return (
    <header className="hidden lg:flex items-center justify-between border-b border-border bg-surface px-8 py-5">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>

      <div className="flex items-center gap-5">
        <button
          type="button"
          aria-label={
            notificationCount > 0
              ? `${notificationCount} items to review`
              : "Notifications"
          }
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:bg-primary-light hover:text-primary-dark transition-colors"
        >
          <Bell size={18} />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-review text-white text-[10px] font-semibold">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <Avatar name={caregiverName} src={caregiverAvatarUrl} size="sm" />
          <span className="text-sm font-medium text-text-primary">
            {caregiverName}
          </span>
        </div>
      </div>
    </header>
  );
}