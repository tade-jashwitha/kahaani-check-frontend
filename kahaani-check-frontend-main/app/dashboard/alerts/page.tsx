"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Loader2,
  RotateCcw,
  CalendarClock,
  Mic,
  FileText,
  X,
  Info,
} from "lucide-react";

import PageContainer from "@/app/components/ui/PageContainer";
import PageHeader from "@/app/components/ui/PageHeader";
import Button from "@/app/components/ui/Button";

import { useAlerts } from "@/app/features/alerts/hooks";
import type { Alert } from "@/app/features/alerts/types";

// ============================================================
// Caregiver-Friendly Alert Detail Modal
// ============================================================

interface AlertDetailModalProps {
  alert: Alert | null;
  onClose: () => void;
  onMarkDone: (id: string) => void;
  isResolving: boolean;
}

function AlertDetailModal({
  alert,
  onClose,
  onMarkDone,
  isResolving,
}: AlertDetailModalProps) {
  if (!alert) return null;

  const formattedDate = new Date(alert.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-xl sm:p-7">
        {/* Modal Top Header */}
        <div className="flex items-start justify-between border-b border-[#E3E8E5] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
                Review Details
              </span>
              <h3 id="modal-alert-title" className="mt-1 text-base font-bold text-[#173B38]">
                Speech Pattern Variation Noted
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#6B7D79] hover:bg-[#F8F6F0] hover:text-[#173B38] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="mt-5 space-y-4 text-xs">
          {/* Elder & Time Info */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                Family Member
              </span>
              <p className="mt-0.5 font-bold text-[#173B38] text-sm">{alert.elder_name}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                Observed At
              </span>
              <p className="mt-0.5 font-semibold text-[#173B38]">{formattedDate}</p>
            </div>
          </div>

          {/* Observed Pattern Summary */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#147D72]">
              Observation Summary
            </h4>
            <p className="mt-1 text-sm font-semibold text-[#173B38] leading-relaxed">
              Recent speech patterns differ from {alert.elder_name}&apos;s established personal baseline.
            </p>
            <p className="mt-1 text-xs text-[#6B7D79] leading-relaxed">
              {alert.detail ||
                "Acoustic tempo and conversational pauses showed measurable variation compared with their historical voice recordings."}
            </p>
          </div>

          {/* "Why This Matters" Educational Section */}
          <div className="rounded-xl border border-[#C8DFD9] bg-[#F4FAF8] p-4 text-[#173B38]">
            <div className="flex items-center gap-1.5 font-bold text-[#147D72] mb-1">
              <Info size={15} />
              <span>Why this matters</span>
            </div>
            <p className="text-xs leading-relaxed text-[#4D635F]">
              Changes in speech patterns can occur for many reasons, including fatigue, sleep changes, medication changes, stress, or other factors. This observation does not provide a medical diagnosis.
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[#E3E8E5] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E3E8E5] bg-white px-4 py-2 text-xs font-semibold text-[#6B7D79] hover:bg-[#FAF8F5] transition text-center"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {alert.elder_id && (
              <Link href={`/dashboard/elders/${alert.elder_id}/report`} className="w-full sm:w-auto">
                <button
                  type="button"
                  className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-[#147D72] bg-[#E8F3F0] px-3.5 py-2 text-xs font-semibold text-[#147D72] hover:bg-[#D5EAE4] transition"
                >
                  <FileText size={14} />
                  View Doctor Report
                </button>
              </Link>
            )}

            <button
              type="button"
              disabled={isResolving}
              onClick={() => {
                onMarkDone(alert.id);
                onClose();
              }}
              className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-[#147D72] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105E57] transition disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              {isResolving ? "Updating..." : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Alert Row Card
// ============================================================

interface AlertRowProps {
  alert: Alert;
  onResolve: (id: string) => void;
  onOpenDetails: (alert: Alert) => void;
  isResolving: boolean;
}

function AlertRow({ alert, onResolve, onOpenDetails, isResolving }: AlertRowProps) {
  const isScheduled =
    alert.message.toLowerCase().includes("scheduled") ||
    (alert.detail || "").toLowerCase().includes("scheduled");
  const isAmber = alert.severity === "amber";

  const accentBg = isScheduled
    ? "bg-[#FFFDF5] border-[#D97706]/30"
    : isAmber
    ? "bg-[#FFFBEB] border-[#F59E0B]/40"
    : "bg-[#FFF1F1] border-[#EF4444]/40";

  const iconBg = isScheduled
    ? "bg-[#FEF3C7] text-[#D97706]"
    : isAmber
    ? "bg-[#FEF3C7] text-[#D97706]"
    : "bg-[#FEE2E2] text-[#DC2626]";

  const formattedDate = new Date(alert.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-200 ${accentBg}`}>
      <div className="flex items-start gap-4">
        {/* Severity / Type Icon */}
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          aria-hidden="true"
        >
          {isScheduled ? <CalendarClock size={18} /> : <AlertTriangle size={18} />}
        </div>

        {/* Content Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#173B38]">{alert.elder_name}</span>

            {isScheduled ? (
              <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#92400E] border border-[#FDE68A]">
                SCHEDULED CHECK-IN
              </span>
            ) : (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                  isAmber
                    ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                    : "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
                }`}
              >
                REVIEW
              </span>
            )}
          </div>

          {/* Heading */}
          <h3 className="mt-1 text-xs font-semibold text-[#173B38] sm:text-sm">
            {isScheduled ? alert.message : "Speech Pattern Variation Noted"}
          </h3>

          {/* Plain-Language Description (Non-technical) */}
          <p className="mt-0.5 text-[11px] text-[#6B7D79] leading-relaxed">
            {isScheduled
              ? alert.detail || "A weekly voice check-in session is scheduled for today."
              : "Recent speech patterns differ from the person's established personal baseline."}
          </p>

          <p className="mt-2 text-[10px] font-medium text-[#8F9E9B]">{formattedDate}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
        {isScheduled ? (
          // Scheduled Check-in Actions: Primary = Start Voice Check-in, Secondary = Done
          <>
            <Link
              href={
                alert.checkin_id && alert.elder_id
                  ? `/dashboard/elders/${alert.elder_id}/checkins/${alert.checkin_id}`
                  : alert.elder_id
                  ? `/dashboard/elders/${alert.elder_id}/checkins`
                  : "/dashboard/checkins"
              }
            >
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-[#147D72] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#105E57]"
              >
                <Mic size={13} />
                <span>Start Voice Check-in</span>
                <ChevronRight size={13} />
              </button>
            </Link>

            <button
              type="button"
              disabled={isResolving}
              onClick={() => onResolve(alert.id)}
              className="flex items-center gap-1.5 rounded-xl border border-[#E3E8E5] bg-white px-3.5 py-2 text-xs font-semibold text-[#173B38] transition hover:bg-[#F8F6F0] disabled:opacity-50"
            >
              <CheckCircle2 size={13} className="text-[#147D72]" />
              <span>{isResolving ? "Updating..." : "Done"}</span>
            </button>
          </>
        ) : (
          // Speech Pattern Shift Actions: Primary = Review Details, Secondary = Done
          <>
            <button
              type="button"
              onClick={() => onOpenDetails(alert)}
              className="flex items-center gap-1.5 rounded-xl border border-[#147D72] bg-[#E8F3F0] px-3.5 py-2 text-xs font-semibold text-[#147D72] transition hover:bg-[#D5EAE4]"
            >
              <Info size={13} />
              <span>Review Details</span>
            </button>

            <button
              type="button"
              disabled={isResolving}
              onClick={() => onResolve(alert.id)}
              className="flex items-center gap-1.5 rounded-xl bg-[#147D72] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#105E57] disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
              <span>{isResolving ? "Updating..." : "Done"}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Alerts Page
// ============================================================

export default function AlertsPage() {
  const {
    alerts,
    resolveAlert,
    loading,
    resolvingIds,
    error,
    clearError,
    refreshAlerts,
  } = useAlerts();

  const [selectedDetailAlert, setSelectedDetailAlert] = useState<Alert | null>(null);

  const unresolved = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);

  return (
    <PageContainer>
      {/* ── ERROR NOTICE (IF RESOLUTION FAILS) ── */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-3 text-xs text-[#92400E]"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-[#D97706]" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-[11px] font-semibold text-[#92400E] underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <PageHeader
          title="Alerts & Notifications"
          subtitle="Items that need your attention — review observations and mark as done to keep the dashboard clear."
          badge={
            unresolved.length > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#92400E] border border-[#FDE68A]">
                <Bell size={12} />
                {unresolved.length} needs attention
              </span>
            ) : undefined
          }
        />

        <button
          type="button"
          onClick={() => refreshAlerts()}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-[#E3E8E5] bg-white px-3 py-1.5 text-xs font-medium text-[#173B38] hover:bg-[#F8F6F0] transition disabled:opacity-50"
        >
          <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading && alerts.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-[#E3E8E5] bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-[#147D72]" />
        </div>
      ) : alerts.length === 0 ? (
        /* ── ALL CLEAR / EMPTY STATE ── */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E3E8E5] bg-white py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F3F0]">
            <Sparkles size={28} className="text-[#147D72]" />
          </div>
          <h2 className="mt-4 text-base font-bold text-[#173B38]">
            No active alerts
          </h2>
          <p className="mt-1 max-w-xs text-xs text-[#6B7D79]">
            You&apos;re all caught up. Notifications will appear here when a weekly session is scheduled or when speech patterns show noticeable variation.
          </p>
          <Link href="/dashboard" className="mt-6">
            <Button variant="primary">Back to Home</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ── NEEDS ATTENTION SECTION ── */}
          <section className="mb-8 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7D79]">
              Needs Attention ({unresolved.length})
            </h2>

            {unresolved.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#86EFAC] bg-[#F0FDF4] p-5 text-[#15803D]">
                <CheckCircle2 size={20} className="shrink-0" />
                <div>
                  <h3 className="text-xs font-bold">No active alerts</h3>
                  <p className="text-[11px] text-[#4D635F]">
                    You&apos;re all caught up. All current speech observations and check-ins have been reviewed.
                  </p>
                </div>
              </div>
            ) : (
              unresolved.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onResolve={resolveAlert}
                  onOpenDetails={setSelectedDetailAlert}
                  isResolving={resolvingIds.includes(alert.id)}
                />
              ))
            )}
          </section>

          {/* ── DONE / ALERT HISTORY SECTION ── */}
          {resolved.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7D79]">
                Alert History / Done ({resolved.length})
              </h2>
              <div className="space-y-2 opacity-75">
                {resolved.map((alert) => {
                  const isScheduled =
                    alert.message.toLowerCase().includes("scheduled") ||
                    (alert.detail || "").toLowerCase().includes("scheduled");
                  return (
                    <div
                      key={alert.id}
                      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#E3E8E5] bg-white px-5 py-3.5 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 size={16} className="text-[#147D72] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#173B38] truncate">
                            {alert.elder_name} — {isScheduled ? alert.message : "Speech Pattern Variation Noted"}
                          </p>
                          <p className="text-[10px] text-[#8F9E9B]">
                            {new Date(alert.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <span className="rounded-full bg-[#E8F3F0] px-2 py-0.5 text-[10px] font-bold text-[#147D72]">
                          Done
                        </span>
                        {!isScheduled && alert.elder_id && (
                          <button
                            type="button"
                            onClick={() => setSelectedDetailAlert(alert)}
                            className="text-[11px] font-semibold text-[#147D72] hover:underline"
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── CAREGIVER DETAIL MODAL ── */}
      <AlertDetailModal
        alert={selectedDetailAlert}
        onClose={() => setSelectedDetailAlert(null)}
        onMarkDone={resolveAlert}
        isResolving={selectedDetailAlert ? resolvingIds.includes(selectedDetailAlert.id) : false}
      />
    </PageContainer>
  );
}
