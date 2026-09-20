"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarDays,
  FileAudio,
  FileText,
  CheckCircle2,
} from "lucide-react";

import Badge from "@/app/components/ui/Badge";

export interface CheckinCardData {
  id: string;
  elderId: string;
  elderName?: string;
  scheduledAt?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  status: string;
  hasRecording?: boolean;
  durationSeconds?: number | null;
  speakingRateWpm?: number | null;
  pauseDensity?: number | null;
  lexicalDiversity?: number | null;
  transcriptPreview?: string | null;
}

interface CheckinCardProps {
  checkin: CheckinCardData;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function CheckinCard({ checkin }: CheckinCardProps) {
  const isCompleted = checkin.status === "completed";
  const isInitiated = checkin.status === "initiated";
  const dateString = checkin.completedAt || checkin.createdAt || checkin.scheduledAt;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#E3E8E5] bg-[#FFFFFF] p-5 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)] transition hover:border-[#147D72]/40 hover:shadow-[0_4px_12px_0_rgba(23,59,56,0.07)] sm:flex-row sm:items-center">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isCompleted
              ? "bg-[#E8F3F0] text-[#147D72]"
              : isInitiated
              ? "bg-[#F8EBDD] text-[#A86A43]"
              : "bg-[#F8F6F0] text-[#6B7D79]"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 size={20} />
          ) : isInitiated ? (
            <FileAudio size={20} />
          ) : (
            <CalendarDays size={20} />
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#173B38]">
              {checkin.elderName || "Voice Check-in"}
            </span>
            <Badge
              variant={isCompleted ? "green" : isInitiated ? "orange" : "gray"}
            >
              {isCompleted
                ? "Completed"
                : isInitiated
                ? "In Progress"
                : checkin.status.charAt(0).toUpperCase() + checkin.status.slice(1)}
            </Badge>
          </div>

          <p className="mt-1 text-xs text-[#6B7D79]">
            {formatDate(dateString)}
          </p>

          {/* EXTRACTED METRIC PILLS */}
          {(checkin.speakingRateWpm || checkin.pauseDensity || checkin.lexicalDiversity) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
              {checkin.speakingRateWpm && (
                <span className="rounded-md bg-[#F8F6F0] px-2 py-0.5 font-medium text-[#173B38]">
                  Rate: {checkin.speakingRateWpm.toFixed(0)} WPM
                </span>
              )}
              {checkin.pauseDensity && (
                <span className="rounded-md bg-[#F8F6F0] px-2 py-0.5 font-medium text-[#173B38]">
                  Pause: {checkin.pauseDensity.toFixed(2)}
                </span>
              )}
              {checkin.lexicalDiversity && (
                <span className="rounded-md bg-[#F8F6F0] px-2 py-0.5 font-medium text-[#173B38]">
                  Diversity: {checkin.lexicalDiversity.toFixed(2)}
                </span>
              )}
            </div>
          )}

          {checkin.transcriptPreview && (
            <p className="mt-2 line-clamp-1 max-w-xl text-xs italic text-[#8F9E9B]">
              &ldquo;{checkin.transcriptPreview}&rdquo;
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 items-center gap-2 sm:mt-0">
        <Link
          href={`/dashboard/elders/${checkin.elderId}/checkins/${checkin.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3E8E5] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#147D72] transition hover:bg-[#E8F3F0]"
        >
          <FileText size={14} />
          {isCompleted ? "View Details" : "Resume Check-in"}
        </Link>
      </div>
    </div>
  );
}
