"use client";

import React from "react";
import Link from "next/link";
import {
  Phone,
  Globe,
  ShieldCheck,
  TrendingUp,
  Mic,
  ChevronRight,
} from "lucide-react";

import Avatar from "@/app/components/ui/Avatar";
import Badge from "@/app/components/ui/Badge";

export interface ElderCardData {
  id: string;
  display_name: string;
  phone_e164: string;
  preferred_call_language: string;
  dob_year_range?: string | null;
  status?: string;
  baselineReady?: boolean;
  baselineProgress?: number; // 0, 1, 2, 3
  checkinCount?: number;
}

interface ElderCardProps {
  elder: ElderCardData;
  onStartCheckin?: (elderId: string) => void;
  startingCheckin?: boolean;
}

function formatLanguage(code: string): string {
  const map: Record<string, string> = {
    hi: "Hindi",
    en: "English",
    te: "Telugu",
    ta: "Tamil",
    mr: "Marathi",
    bn: "Bengali",
    gu: "Gujarati",
    kn: "Kannada",
  };
  return map[code?.toLowerCase()] || code?.toUpperCase() || "Hindi";
}

export default function ElderCard({
  elder,
  onStartCheckin,
  startingCheckin = false,
}: ElderCardProps) {
  const progress = elder.baselineProgress ?? (elder.baselineReady ? 3 : 0);
  const isBaselineReady = elder.baselineReady || progress >= 3;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#E3E8E5] bg-[#FFFFFF] p-5 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)] transition hover:border-[#147D72]/40 hover:shadow-[0_4px_12px_0_rgba(23,59,56,0.07)]">
      <div>
        {/* HEADER: AVATAR & NAME */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={elder.display_name} size="md" />
            <div>
              <Link
                href={`/dashboard/elders/${elder.id}`}
                className="font-semibold text-[#173B38] transition hover:text-[#147D72]"
              >
                {elder.display_name}
              </Link>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-[#6B7D79]">
                <span>{elder.dob_year_range ? `Born in ${elder.dob_year_range}` : "Family Elder"}</span>
                <span>•</span>
                <span>{formatLanguage(elder.preferred_call_language)}</span>
              </div>
            </div>
          </div>

          <Badge variant="teal" icon={<ShieldCheck size={12} />}>
            Active
          </Badge>
        </div>

        {/* METADATA PILLS */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#6B7D79]">
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#F8F6F0] px-2.5 py-1">
            <Phone size={12} className="text-[#8F9E9B]" />
            {elder.phone_e164}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#F8F6F0] px-2.5 py-1">
            <Globe size={12} className="text-[#8F9E9B]" />
            {formatLanguage(elder.preferred_call_language)}
          </span>
        </div>

        {/* BASELINE CALIBRATION PROGRESS */}
        <div className="mt-4 rounded-xl bg-[#F8F6F0] p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#6B7D79]">
              {isBaselineReady ? "Baseline Established" : `Baseline Progress: ${progress}/3 check-ins`}
            </span>
            <span className="font-semibold text-[#147D72]">
              {isBaselineReady ? "100%" : `${Math.round((progress / 3) * 100)}%`}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E3E8E5]">
            <div
              className="h-full rounded-full bg-[#147D72] transition-all duration-300"
              style={{ width: `${Math.min((progress / 3) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="mt-5 flex items-center gap-2.5 border-t border-[#E3E8E5] pt-4">
        {onStartCheckin ? (
          <button
            type="button"
            onClick={() => onStartCheckin(elder.id)}
            disabled={startingCheckin}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#147D72] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#105E57] disabled:opacity-60"
          >
            <Mic size={14} />
            Check-in
          </button>
        ) : (
          <Link
            href={`/dashboard/elders/${elder.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#147D72] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#105E57]"
          >
            <Mic size={14} />
            Check-in
          </Link>
        )}

        <Link
          href={`/dashboard/elders/${elder.id}/trends`}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#E3E8E5] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#173B38] transition hover:bg-[#F8F6F0]"
        >
          <TrendingUp size={14} className="text-[#147D72]" />
          Trends
        </Link>

        <Link
          href={`/dashboard/elders/${elder.id}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#E3E8E5] text-[#8F9E9B] transition hover:border-[#147D72] hover:text-[#147D72]"
          title="View Elder Profile"
        >
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
