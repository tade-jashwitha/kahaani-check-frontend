"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Mic,
  Bell,
  Loader2,
  Users,
  CalendarDays,
  ChevronRight,
} from "lucide-react";

import PageContainer from "@/app/components/ui/PageContainer";
import Avatar from "@/app/components/ui/Avatar";
import Button from "@/app/components/ui/Button";
import EmptyState from "@/app/components/ui/EmptyState";

import { useElders } from "@/app/features/elders/hooks";
import type { Elder } from "@/app/features/elders/types";
import { startCheckin } from "@/app/features/checkins/api";
import { useAlerts } from "@/app/features/alerts/hooks";


// ============================================================
// Helpers
// ============================================================

function useCaregiverName(): string {
  const [name, setName] = useState("Caregiver");
  useEffect(() => {
    const email = localStorage.getItem("kahaani_user_email") || "";
    setName(email ? email.split("@")[0] : "Caregiver");
  }, []);
  return name;
}

/**
 * Derive the elder's health status dot color.
 *
 * Green  = last check-in within 7 days (or status "active" with no check-in data)
 * Amber  = 8–14 days since last check-in
 * Red    = 15+ days since last check-in or no check-ins at all
 *
 * When we have no check-in timestamps we fall back to "active" → green.
 */
function getStatusDot(elder: Elder): { color: string; label: string } {
  // We derive dot from the elder's status field as a proxy until
  // we have real last-check-in-at data from the API.
  if (elder.status === "active") {
    return { color: "bg-[#22C55E]", label: "Active" };
  }
  if (elder.status === "inactive") {
    return { color: "bg-[#F59E0B]", label: "Overdue" };
  }
  return { color: "bg-[#EF4444]", label: "Needs attention" };
}

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "No check-in yet";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}


// ============================================================
// Elder Status Card — compact horizontal scroll card
// ============================================================

function ElderStatusCard({
  elder,
  onCheckin,
  loading,
}: {
  elder: Elder;
  onCheckin: (id: string) => void;
  loading: boolean;
}) {
  const dot = getStatusDot(elder);

  return (
    <Link
      href={`/dashboard/elders/${elder.id}`}
      className="flex-shrink-0 w-40 rounded-2xl border border-[#E3E8E5] bg-white p-4 shadow-sm transition hover:border-[#147D72]/40 hover:shadow-md active:scale-[0.98]"
    >
      <div className="relative w-fit mx-auto mb-3">
        <Avatar name={elder.display_name} size="lg" />
        {/* Status dot */}
        <span
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${dot.color}`}
          title={dot.label}
        />
      </div>

      <p className="text-center text-xs font-semibold text-[#173B38] truncate">
        {elder.display_name}
      </p>
      <p className="mt-0.5 text-center text-[10px] text-[#6B7D79]">
        {formatRelativeTime(elder.created_at)}
      </p>

      {/* Quick check-in tap */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCheckin(elder.id);
        }}
        disabled={loading}
        className="mt-3 w-full flex items-center justify-center gap-1 rounded-xl bg-[#E8F3F0] py-1.5 text-[11px] font-semibold text-[#147D72] transition hover:bg-[#C8DFD9] disabled:opacity-50"
      >
        <Mic size={12} />
        Check-in
      </button>
    </Link>
  );
}


// ============================================================
// Today's Check-ins Row
// ============================================================

interface TodayCheckin {
  id: string;
  elderId: string;
  elderName: string;
  time: string;
  status: string;
}

function CheckinRow({ ci }: { ci: TodayCheckin }) {
  const statusColor =
    ci.status === "completed"
      ? "bg-[#DCFCE7] text-[#166534]"
      : ci.status === "initiated"
      ? "bg-[#FEF3C7] text-[#92400E]"
      : "bg-[#F3F4F6] text-[#374151]";

  return (
    <Link
      href={`/dashboard/elders/${ci.elderId}/checkins/${ci.id}`}
      className="flex items-center justify-between rounded-xl border border-[#E3E8E5] bg-white px-4 py-3 transition hover:border-[#147D72]/40 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <Avatar name={ci.elderName} size="sm" />
        <div>
          <p className="text-xs font-semibold text-[#173B38]">{ci.elderName}</p>
          <p className="text-[10px] text-[#6B7D79]">{ci.time}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${statusColor}`}>
          {ci.status}
        </span>
        <ChevronRight size={14} className="text-[#8F9E9B]" />
      </div>
    </Link>
  );
}


// ============================================================
// Page
// ============================================================

export default function HomePage() {
  const router = useRouter();
  const caregiverName = useCaregiverName();
  const { elders, loading } = useElders();
  const { unreadCount } = useAlerts();
  const [startingCheckin, setStartingCheckin] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  async function handleStartCheckin(elderId?: string) {
    const targetId = elderId || elders[0]?.id;
    if (!targetId) {
      router.push("/dashboard/elders/new");
      return;
    }

    try {
      setStartingCheckin(true);
      setStartingId(targetId);
      const res = await startCheckin(targetId);
      const checkInId = res?.check_in?.id;

      if (checkInId) {
        router.push(`/dashboard/elders/${targetId}/checkins/${checkInId}`);
      } else {
        router.push(`/dashboard/elders/${targetId}/checkins`);
      }
    } catch {
      router.push(`/dashboard/elders/${targetId}/checkins`);
    } finally {
      setStartingCheckin(false);
      setStartingId(null);
    }
  }

  // Derive today's check-ins from elder list (placeholder until real API)
  const todayCheckins: TodayCheckin[] = [];

  return (
    <PageContainer>
      {/* ── ACTIVE ALERTS BANNER ── */}
      {unreadCount > 0 && (
        <Link href="/dashboard/alerts">
          <section className="mb-5 flex items-center justify-between rounded-2xl border border-[#F59E0B]/40 bg-[#FFFBEB] px-5 py-3.5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEF3C7]">
                <Bell size={18} className="text-[#D97706]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#92400E]">
                  {unreadCount} item{unreadCount > 1 ? "s" : ""} need{unreadCount === 1 ? "s" : ""} your attention
                </p>
                <p className="text-[11px] text-[#B45309]">
                  Tap to review alerts and resolve
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#D97706]" />
          </section>
        </Link>
      )}

      {/* ── GREETING ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#173B38]">
            Good {getGreeting()}, {caregiverName}
          </h1>
          <p className="mt-0.5 text-xs text-[#6B7D79]">
            Family voice monitoring overview
          </p>
        </div>
        <Link href="/dashboard/elders/new">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#147D72] text-white shadow-sm transition hover:bg-[#105E57]"
            aria-label="Add family member"
          >
            <Plus size={18} />
          </button>
        </Link>
      </div>

      {/* ── ELDER STATUS CARDS — horizontal scroll ── */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#173B38]">Family Members</h2>
          <Link
            href="/dashboard/elders"
            className="text-xs font-semibold text-[#147D72] hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <div className="flex h-44 items-center justify-center rounded-2xl border border-[#E3E8E5] bg-white">
            <Loader2 className="h-5 w-5 animate-spin text-[#147D72]" />
          </div>
        ) : elders.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="No family members added yet"
            description="Add your first elder to begin tracking voice health."
            action={
              <Link href="/dashboard/elders/new">
                <Button variant="primary" icon={<Plus size={14} />}>
                  Add Family Member
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {elders.map((elder) => (
              <ElderStatusCard
                key={elder.id}
                elder={elder}
                onCheckin={handleStartCheckin}
                loading={startingCheckin && startingId === elder.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── TODAY'S CHECK-INS ── */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#173B38]">Today&apos;s Check-ins</h2>
          <Link
            href="/dashboard/checkins"
            className="text-xs font-semibold text-[#147D72] hover:underline"
          >
            View all
          </Link>
        </div>

        {todayCheckins.length === 0 ? (
          <div className="rounded-2xl border border-[#E3E8E5] bg-white p-6 text-center">
            <CalendarDays size={22} className="mx-auto mb-2 text-[#8F9E9B]" />
            <p className="text-xs font-semibold text-[#173B38]">No check-ins today</p>
            <p className="mt-1 text-[11px] text-[#6B7D79]">
              Start a voice check-in for any family member.
            </p>
            {elders.length > 0 && (
              <button
                type="button"
                onClick={() => handleStartCheckin()}
                disabled={startingCheckin}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#147D72] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#105E57] disabled:opacity-60"
              >
                <Mic size={13} />
                Start Check-in
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {todayCheckins.map((ci) => (
              <CheckinRow key={ci.id} ci={ci} />
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}