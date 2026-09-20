"use client";

import React, { useMemo } from "react";
import {
  Printer,
  X,
  FileText,
  Calendar,
  User,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Heart,
  TrendingUp,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { Alert } from "@/app/features/alerts/types";

export interface DoctorReportElder {
  id: string;
  display_name: string;
  phone_e164?: string;
  preferred_call_language?: string;
  dob_year_range?: string | null;
  timezone?: string;
  status?: string;
  created_at?: string;
}

export interface DoctorReportBiomarkerComp {
  current_value?: number | null;
  baseline_value?: number | null;
  absolute_diff?: number | null;
  percentage_diff?: number | null;
  trend_direction?: "higher" | "lower" | "typical" | "calibrating" | "unavailable" | string;
  comparison_label?: string;
  status?: string;
  z_score?: number | null;
}

export interface DoctorReportObservation {
  observation_number?: number;
  recorded_at?: string;
  overall_status?: string;
  features?: {
    speaking_rate_wpm?: number | null;
    pause_density?: number | null;
    lexical_diversity_ttr?: number | null;
    speech_duration_seconds?: number | null;
  };
  biomarker_comparisons?: {
    speaking_rate?: DoctorReportBiomarkerComp;
    pause_density?: DoctorReportBiomarkerComp;
    lexical_diversity?: DoctorReportBiomarkerComp;
  };
  previous_session_comparison?: {
    speaking_rate_diff?: number | null;
    pause_density_diff?: number | null;
    lexical_diversity_diff?: number | null;
    session_label?: string;
  } | null;
  transcript?: {
    id?: string;
    text?: string;
    language?: string;
    confidence?: number;
  } | null;
}

export interface DoctorReportBaseline {
  speaking_rate_mean?: number | null;
  speaking_rate_stddev?: number | null;
  pause_density_mean?: number | null;
  pause_density_stddev?: number | null;
  lexical_diversity_mean?: number | null;
  lexical_diversity_stddev?: number | null;
  sample_count?: number | null;
  created_at?: string;
}

export interface DoctorReportCaregiverSummary {
  status?: string;
  headline?: string;
  observations_count?: number;
  baseline_sample_count?: number;
  key_observations?: string[];
  longitudinal_direction?: string;
  disclaimer?: string;
}

export interface DoctorReportProps {
  elder: DoctorReportElder;
  trajectoryStatus?: string;
  baseline?: DoctorReportBaseline | null;
  observations?: DoctorReportObservation[];
  caregiverSummary?: DoctorReportCaregiverSummary | null;
  alerts?: Alert[];
  caregiverNotes?: string;
  onClose?: () => void;
  isModal?: boolean;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatFullDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatLanguage(code?: string): string {
  if (!code) return "English";
  const map: Record<string, string> = {
    hi: "Hindi (हिंदी)",
    en: "English",
    te: "Telugu (తెలుగు)",
    ta: "Tamil (தமிழ்)",
    mr: "Marathi (मराठी)",
    bn: "Bengali (বাংলা)",
    gu: "Gujarati (ગુજરાતી)",
    kn: "Kannada (ಕನ್ನಡ)",
  };
  return map[code.toLowerCase()] || code.toUpperCase();
}

export default function DoctorReportView({
  elder,
  trajectoryStatus,
  baseline,
  observations = [],
  caregiverSummary,
  alerts = [],
  caregiverNotes = "",
  onClose,
  isModal = false,
}: DoctorReportProps) {
  const reportDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  const sortedObs = useMemo(() => {
    return [...observations].sort(
      (a, b) => new Date(a.recorded_at || 0).getTime() - new Date(b.recorded_at || 0).getTime()
    );
  }, [observations]);

  const latestObs = sortedObs.length > 0 ? sortedObs[sortedObs.length - 1] : null;
  const firstObs = sortedObs.length > 0 ? sortedObs[0] : null;

  const isBaselineReady = Boolean(baseline) || sortedObs.length >= 3;

  // Monitoring period calculation
  const monitoringPeriod = useMemo(() => {
    if (!firstObs?.recorded_at || !latestObs?.recorded_at) {
      return "Monitoring in initial phase";
    }
    const startStr = formatDate(firstObs.recorded_at);
    const endStr = formatDate(latestObs.recorded_at);
    if (startStr === endStr) return startStr;
    return `${startStr} – ${endStr}`;
  }, [firstObs, latestObs]);

  // Overall human status
  const normalizedOverallStatus = useMemo(() => {
    const raw = (trajectoryStatus || "").toLowerCase();
    if (raw.includes("change") || raw.includes("attention") || raw.includes("deviat")) {
      return {
        label: "Attention Required",
        sub: "A noticeable speech pattern deviation was detected from the personal baseline.",
        color: "text-[#B45309] bg-[#FEF3C7] border-[#FCD34D]",
        badge: "bg-[#D97706] text-white",
      };
    }
    if (!isBaselineReady || raw.includes("collect") || raw.includes("calibrat")) {
      return {
        label: "Monitor",
        sub: "Baseline calibration in progress. Routine longitudinal monitoring recommended.",
        color: "text-[#0F766E] bg-[#CCFBF1] border-[#99F6E4]",
        badge: "bg-[#0F766E] text-white",
      };
    }
    return {
      label: "Stable",
      sub: "No significant change detected from the personal baseline.",
      color: "text-[#15803D] bg-[#DCFCE7] border-[#86EFAC]",
      badge: "bg-[#15803D] text-white",
    };
  }, [trajectoryStatus, isBaselineReady]);

  // Non-diagnostic AI Summary
  const aiClinicalSummary = useMemo(() => {
    if (sortedObs.length === 0) {
      return "No audio check-in observations have been recorded yet for this patient. Longitudinal baseline tracking will commence following completed speech check-ins.";
    }

    if (!isBaselineReady) {
      return `Baseline calibration is currently underway (${sortedObs.length} of 3 sessions recorded). Conversational speech samples are being collected to establish the patient's individual acoustic baseline. Current observations reflect preliminary check-in samples without definitive longitudinal comparison.`;
    }

    if (normalizedOverallStatus.label === "Attention Required") {
      return `Longitudinal acoustic speech tracking indicates a noticeable deviation from ${elder.display_name}'s established personal baseline. The variance is primarily observed in vocal tempo rhythm and pause duration. This report summarizes recent acoustic markers to assist clinician review. Clinical correlation with general wellness and routine follow-up is recommended.`;
    }

    return `Conversational acoustic speech characteristics for ${elder.display_name} were compared against their established personal baseline. Over the observed monitoring period (${monitoringPeriod}), vocal pacing, pause density, and lexical flow have remained consistent with personal historical patterns. No sustained acoustic deviations were detected.`;
  }, [sortedObs.length, isBaselineReady, normalizedOverallStatus.label, elder.display_name, monitoringPeriod]);

  // Chart data for Page 2 Longitudinal Trend
  const trendData = useMemo(() => {
    return sortedObs.map((obs, idx) => {
      const dateLabel = obs.recorded_at
        ? new Date(obs.recorded_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
        : `S${idx + 1}`;
      return {
        session: dateLabel,
        rate: obs.features?.speaking_rate_wpm ? Math.round(obs.features.speaking_rate_wpm) : null,
        baselineRate: baseline?.speaking_rate_mean ? Math.round(baseline.speaking_rate_mean) : null,
        pause: obs.features?.pause_density ? Number((obs.features.pause_density * 100).toFixed(0)) : null,
        status: obs.overall_status || "Stable",
      };
    });
  }, [sortedObs, baseline]);

  // Technical biomarker rows for Page 4
  const biomarkerRows = useMemo(() => {
    const f = latestObs?.features;
    if (!f) return [];

    const rows = [];

    // Speaking rate
    if (typeof f.speaking_rate_wpm === "number") {
      const cur = f.speaking_rate_wpm;
      const base = baseline?.speaking_rate_mean ?? null;
      let diffStr = "—";
      let shift = "Within baseline tolerance";
      if (base !== null) {
        const delta = cur - base;
        const pct = (delta / base) * 100;
        diffStr = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} WPM (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
        shift = Math.abs(pct) > 20 ? (pct < 0 ? "Noticeable reduction" : "Noticeable elevation") : "Within typical range";
      }
      rows.push({
        name: "Speaking Rate",
        unit: "Words / min (WPM)",
        current: `${cur.toFixed(0)} WPM`,
        baseline: base !== null ? `${base.toFixed(0)} WPM` : "Calibrating",
        diff: diffStr,
        interpretation: shift,
      });
    }

    // Pause density
    if (typeof f.pause_density === "number") {
      const cur = f.pause_density;
      const base = baseline?.pause_density_mean ?? null;
      let diffStr = "—";
      let shift = "Within baseline tolerance";
      if (base !== null) {
        const delta = cur - base;
        const pct = (delta / base) * 100;
        diffStr = `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
        shift = Math.abs(pct) > 25 ? (pct > 0 ? "Increased pause density" : "Decreased pause density") : "Within typical range";
      }
      rows.push({
        name: "Pause Density",
        unit: "Ratio (pause / speech duration)",
        current: cur.toFixed(2),
        baseline: base !== null ? base.toFixed(2) : "Calibrating",
        diff: diffStr,
        interpretation: shift,
      });
    }

    // Lexical Diversity
    if (typeof f.lexical_diversity_ttr === "number") {
      const cur = f.lexical_diversity_ttr;
      const base = baseline?.lexical_diversity_mean ?? null;
      let diffStr = "—";
      let shift = "Within baseline tolerance";
      if (base !== null) {
        const delta = cur - base;
        const pct = (delta / base) * 100;
        diffStr = `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
        shift = Math.abs(pct) > 20 ? (pct < 0 ? "Lower vocabulary diversity" : "Elevated lexical diversity") : "Within typical range";
      }
      rows.push({
        name: "Lexical Diversity (TTR)",
        unit: "Type-Token Ratio [0.0 - 1.0]",
        current: cur.toFixed(2),
        baseline: base !== null ? base.toFixed(2) : "Calibrating",
        diff: diffStr,
        interpretation: shift,
      });
    }

    // Speech Duration
    if (typeof f.speech_duration_seconds === "number") {
      rows.push({
        name: "Speech Duration",
        unit: "Seconds",
        current: `${f.speech_duration_seconds.toFixed(0)}s`,
        baseline: "—",
        diff: "—",
        interpretation: "Conversational audio sample verified",
      });
    }

    return rows;
  }, [latestObs, baseline]);

  // Elder-specific alerts
  const elderAlerts = useMemo(() => {
    return alerts.filter((a) => a.elder_id === elder.id);
  }, [alerts, elder.id]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className={`w-full ${isModal ? "fixed inset-0 z-50 overflow-y-auto bg-black/60 p-2 sm:p-6 backdrop-blur-sm" : ""}`}>
      {/* ── PRINT & SCREEN STYLES ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            background: #ffffff !important;
            color: #173b38 !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav,
          aside,
          header,
          .no-print,
          button,
          a.no-print {
            display: none !important;
          }
          .report-doc-wrapper {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .report-page-card {
            page-break-after: always !important;
            break-after: page !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 0 20mm 0 !important;
            margin: 0 !important;
            min-height: 270mm !important;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .report-page-card:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── TOP FLOATING BAR (SCREEN ONLY) ── */}
      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between rounded-xl border border-[#E3E8E5] bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F3F0] text-[#147D72]">
            <FileText size={16} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#173B38] sm:text-sm">
              Doctor Longitudinal Report — {elder.display_name}
            </h2>
            <p className="text-[11px] text-[#6B7D79]">
              6-Page Clinical Longitudinal Dossier • Generated {reportDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-[#147D72] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#105E57]"
          >
            <Printer size={14} />
            <span>Print / Save PDF</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#6B7D79] hover:bg-[#F8F6F0] hover:text-[#173B38]"
              aria-label="Close report"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── REPORT CONTAINER ── */}
      <div className="report-doc-wrapper mx-auto max-w-4xl space-y-8">
        {/* ============================================================ */}
        {/* PAGE 1: PATIENT SUMMARY */}
        {/* ============================================================ */}
        <section className="report-page-card rounded-2xl border border-[#E3E8E5] bg-white p-8 sm:p-12 shadow-sm">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#147D72] pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F3F0] text-[#147D72]">
                    <Heart size={16} className="fill-[#147D72] text-[#147D72]" />
                  </div>
                  <span className="text-base font-bold tracking-tight text-[#173B38]">
                    Kahaani-Check
                  </span>
                  <span className="text-xs font-medium text-[#6B7D79]">
                    • Longitudinal Voice Wellness
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-[#173B38]">
                  Clinical Speech Monitoring Dossier
                </h1>
                <p className="text-xs text-[#6B7D79]">
                  Longitudinal acoustic speech tracking & baseline comparative evaluation
                </p>
              </div>

              <div className="text-right">
                <span className="rounded-full bg-[#E8F3F0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#147D72]">
                  Page 1 of 6 — Patient Summary
                </span>
                <p className="mt-2 text-xs text-[#6B7D79]">
                  Report Date: <strong className="text-[#173B38]">{reportDate}</strong>
                </p>
              </div>
            </div>

            {/* Patient Metadata Grid */}
            <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-5 sm:grid-cols-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  Patient Name
                </span>
                <p className="mt-0.5 text-sm font-bold text-[#173B38]">{elder.display_name}</p>
                <p className="text-[10px] text-[#6B7D79]">ID: {elder.id.slice(0, 8)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  Age / Year Range
                </span>
                <p className="mt-0.5 text-sm font-semibold text-[#173B38]">
                  {elder.dob_year_range ? `Born in ${elder.dob_year_range}` : "Not recorded"}
                </p>
                <p className="text-[10px] text-[#6B7D79]">TZ: {elder.timezone || "Asia/Kolkata"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  Primary Language
                </span>
                <p className="mt-0.5 text-sm font-semibold text-[#173B38]">
                  {formatLanguage(elder.preferred_call_language)}
                </p>
                <p className="text-[10px] text-[#6B7D79]">Weekly Conversational Check-ins</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  Baseline Status
                </span>
                <p className="mt-0.5 text-sm font-bold text-[#147D72]">
                  {isBaselineReady
                    ? `Established (${baseline?.sample_count ?? sortedObs.length} sessions)`
                    : `Calibrating (${sortedObs.length}/3 sessions)`}
                </p>
                <p className="text-[10px] text-[#6B7D79]">Personal Voice Profile</p>
              </div>
            </div>

            {/* Core Monitoring Summary Bar */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-[#E3E8E5] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  Monitoring Period
                </span>
                <p className="mt-1 text-sm font-bold text-[#173B38]">{monitoringPeriod}</p>
              </div>
              <div className="rounded-xl border border-[#E3E8E5] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  Sessions Analyzed
                </span>
                <p className="mt-1 text-sm font-bold text-[#173B38]">{sortedObs.length} Completed</p>
              </div>
              <div className="rounded-xl border border-[#E3E8E5] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  Last Assessment
                </span>
                <p className="mt-1 text-sm font-bold text-[#173B38]">
                  {formatDate(latestObs?.recorded_at)}
                </p>
              </div>
              <div className="rounded-xl border border-[#E3E8E5] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  Overall Status
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${normalizedOverallStatus.badge}`}>
                    {normalizedOverallStatus.label}
                  </span>
                </div>
              </div>
            </div>

            {/* AI-Generated Clinical Summary Box */}
            <div className="mt-6 rounded-xl border border-[#C8DFD9] bg-[#F4FAF8] p-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-[#147D72]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                  Clinical Observation Summary (AI-Generated)
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[#173B38] sm:text-sm">
                {aiClinicalSummary}
              </p>
              {caregiverSummary?.key_observations && caregiverSummary.key_observations.length > 0 && (
                <div className="mt-4 border-t border-[#D5EAE4] pt-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#147D72]">
                    Key Observational Findings:
                  </span>
                  <ul className="mt-1.5 space-y-1 text-xs text-[#173B38]">
                    {caregiverSummary.key_observations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#147D72] shrink-0" />
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Page 1 Footer */}
          <div className="mt-8 border-t border-[#E3E8E5] pt-4 flex items-center justify-between text-[10px] text-[#6B7D79]">
            <span>Patient: {elder.display_name} • Kahaani-Check Clinical Dossier</span>
            <span>Page 1 of 6</span>
          </div>
        </section>

        {/* ============================================================ */}
        {/* PAGE 2: LONGITUDINAL ANALYSIS */}
        {/* ============================================================ */}
        <section className="report-page-card rounded-2xl border border-[#E3E8E5] bg-white p-8 sm:p-12 shadow-sm">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#147D72] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                  Longitudinal Evaluation
                </span>
                <h2 className="text-xl font-black tracking-tight text-[#173B38]">
                  Page 2 — Longitudinal Trajectory & Baseline Comparison
                </h2>
              </div>
              <span className="rounded-full bg-[#E8F3F0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#147D72]">
                Page 2 of 6
              </span>
            </div>

            {/* Overview description */}
            <p className="mt-4 text-xs leading-relaxed text-[#6B7D79]">
              Speech characteristics are tracked across weekly conversational check-ins and calibrated against {elder.display_name}&apos;s personalized acoustic baseline. Dashed lines illustrate established baseline reference norms.
            </p>

            {/* Overall Trend Graph */}
            <div className="mt-5 rounded-xl border border-[#E3E8E5] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#173B38]">
                    Conversational Speaking Rate (WPM) vs Baseline
                  </h4>
                  <p className="text-[11px] text-[#6B7D79]">
                    Longitudinal tempo tracking across recorded sessions ({monitoringPeriod})
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-[#147D72]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#147D72]" /> Observed Session
                  </span>
                  <span className="flex items-center gap-1 text-[#A86A43]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#A86A43]" /> Personal Baseline
                  </span>
                </div>
              </div>

              {trendData.length > 0 ? (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#E3E8E5" strokeDasharray="3 3" />
                      <XAxis dataKey="session" tick={{ fontSize: 10, fill: "#6B7D79" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#6B7D79" }} tickLine={false} unit=" wpm" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: "8px",
                          border: "1px solid #E3E8E5",
                          fontSize: "11px",
                        }}
                      />
                      {baseline?.speaking_rate_mean && (
                        <ReferenceLine
                          y={Math.round(baseline.speaking_rate_mean)}
                          stroke="#A86A43"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name="Speaking Rate"
                        stroke="#147D72"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#147D72" }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center text-xs text-[#6B7D79]">
                  No session recordings available for trend plotting.
                </div>
              )}
            </div>

            {/* Changes Over Time Narrative & Comparison */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                  Changes Over Time
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-[#173B38]">
                  {caregiverSummary?.longitudinal_direction ||
                    `Acoustic consistency has been observed across ${sortedObs.length} sessions. Pacing and pause frequency are benchmarked against the personalized baseline established during initial calibration.`}
                </p>
                <div className="mt-3 text-[11px] text-[#6B7D79]">
                  Monitoring Period: <strong>{monitoringPeriod}</strong>
                </div>
              </div>

              <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                  Personal Baseline Calibration
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-[#173B38]">
                  {isBaselineReady
                    ? `Baseline established from ${baseline?.sample_count ?? 3} initial weekly check-ins. Individual acoustic markers (tempo: ${baseline?.speaking_rate_mean ? Math.round(baseline.speaking_rate_mean) + ' WPM' : 'calibrated'}, pause ratio: ${baseline?.pause_density_mean?.toFixed(2) ?? 'calibrated'}) serve as the patient's personalized benchmark.`
                    : `Baseline is currently collecting (${sortedObs.length}/3 sessions required). Personal acoustic norms are forming.`}
                </p>
                <div className="mt-3 text-[11px] text-[#6B7D79]">
                  Baseline Status: <strong>{isBaselineReady ? "Active & Verified" : "Calibrating"}</strong>
                </div>
              </div>
            </div>

            {/* Significant Deviations Log Table */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#173B38] mb-2">
                Significant Deviations Log
              </h4>
              <div className="overflow-hidden rounded-xl border border-[#E3E8E5]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E3E8E5] bg-[#FAF8F5] text-[10px] font-bold uppercase text-[#6B7D79]">
                    <tr>
                      <th className="px-3.5 py-2">Session Date</th>
                      <th className="px-3 py-2">Biomarker</th>
                      <th className="px-3 py-2 text-right">Observed Value</th>
                      <th className="px-3 py-2 text-right">Baseline Value</th>
                      <th className="px-3.5 py-2">Deviation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8E5] text-[#173B38]">
                    {sortedObs.filter((o) => o.overall_status === "change_detected" || o.overall_status === "attention_required").length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-center text-xs text-[#6B7D79]">
                          No significant deviations from personal baseline recorded across completed sessions.
                        </td>
                      </tr>
                    ) : (
                      sortedObs
                        .filter((o) => o.overall_status === "change_detected" || o.overall_status === "attention_required")
                        .map((obs, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-3.5 py-2 font-medium">{formatDate(obs.recorded_at)}</td>
                            <td className="px-3 py-2 text-[#6B7D79]">Speaking Tempo / Pause Rhythm</td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {obs.features?.speaking_rate_wpm ? `${Math.round(obs.features.speaking_rate_wpm)} WPM` : "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-[#6B7D79]">
                              {baseline?.speaking_rate_mean ? `${Math.round(baseline.speaking_rate_mean)} WPM` : "—"}
                            </td>
                            <td className="px-3.5 py-2">
                              <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">
                                Speech Pattern Shift
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Page 2 Footer */}
          <div className="mt-8 border-t border-[#E3E8E5] pt-4 flex items-center justify-between text-[10px] text-[#6B7D79]">
            <span>Patient: {elder.display_name} • Kahaani-Check Clinical Dossier</span>
            <span>Page 2 of 6</span>
          </div>
        </section>

        {/* ============================================================ */}
        {/* PAGE 3: ALERT HISTORY */}
        {/* ============================================================ */}
        <section className="report-page-card rounded-2xl border border-[#E3E8E5] bg-white p-8 sm:p-12 shadow-sm">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#147D72] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                  Safety & Notification Log
                </span>
                <h2 className="text-xl font-black tracking-tight text-[#173B38]">
                  Page 3 — Alert History & Safety Observations
                </h2>
              </div>
              <span className="rounded-full bg-[#E8F3F0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#147D72]">
                Page 3 of 6
              </span>
            </div>

            <p className="mt-4 text-xs text-[#6B7D79]">
              Every notification generated for {elder.display_name} is cataloged below with severity, date of occurrence, pattern shift attributes, and supporting observational notes. Alerts are triggered exclusively when acoustic markers depart from personal baseline norms.
            </p>

            {/* Alert Table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-[#E3E8E5]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E3E8E5] bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  <tr>
                    <th className="px-3.5 py-3">Date</th>
                    <th className="px-3 py-3">Alert Type</th>
                    <th className="px-3 py-3">Severity</th>
                    <th className="px-3.5 py-3">Observed Change</th>
                    <th className="px-3 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8E5] text-[#173B38]">
                  {elderAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <CheckCircle2 size={24} className="mx-auto text-[#147D72]" />
                        <p className="mt-2 text-xs font-bold text-[#173B38]">
                          No significant alerts detected
                        </p>
                        <p className="text-[11px] text-[#6B7D79]">
                          Speech patterns have remained within consistent longitudinal parameters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    elderAlerts.map((alert) => {
                      const isScheduled =
                        alert.message.toLowerCase().includes("scheduled") ||
                        (alert.detail || "").toLowerCase().includes("scheduled");
                      return (
                        <tr key={alert.id} className="bg-white">
                          <td className="px-3.5 py-3 font-medium whitespace-nowrap">
                            {formatDate(alert.created_at)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap font-semibold text-[#173B38]">
                            {isScheduled ? "Scheduled Check-in" : "Speech Pattern Shift"}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                isScheduled
                                  ? "bg-[#E8F3F0] text-[#147D72]"
                                  : alert.severity === "red"
                                  ? "bg-[#FEE2E2] text-[#B91C1C]"
                                  : "bg-[#FEF3C7] text-[#B45309]"
                              }`}
                            >
                              {isScheduled
                                ? "Routine"
                                : alert.severity === "red"
                                ? "Review"
                                : "Attention"}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-[11px] text-[#4D635F] leading-relaxed">
                            {alert.detail ||
                              (isScheduled
                                ? "Scheduled weekly conversational voice session."
                                : "Acoustic variations detected relative to established personal baseline.")}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                alert.resolved
                                  ? "bg-[#DCFCE7] text-[#15803D]"
                                  : "bg-[#FEF3C7] text-[#B45309]"
                              }`}
                            >
                              {alert.resolved ? "Done / Acknowledged" : "Active / Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Alert Guidance Card */}
            <div className="mt-6 rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#173B38]">
                Clinical Evaluation Guidance for Speech Alerts
              </h4>
              <p className="mt-1.5 text-xs text-[#6B7D79] leading-relaxed">
                Alert notifications reflect conversational acoustic shifts (such as slowed articulation rate, increased pauses, or reduced lexical diversity) compared with the elder&apos;s own baseline. They do not constitute diagnostic findings. Clinicians are encouraged to inquire about sleep quality, medication updates, fatigue, respiratory comfort, or mood changes during follow-up visits.
              </p>
            </div>
          </div>

          {/* Page 3 Footer */}
          <div className="mt-8 border-t border-[#E3E8E5] pt-4 flex items-center justify-between text-[10px] text-[#6B7D79]">
            <span>Patient: {elder.display_name} • Kahaani-Check Clinical Dossier</span>
            <span>Page 3 of 6</span>
          </div>
        </section>

        {/* ============================================================ */}
        {/* PAGE 4: DETAILED SPEECH ANALYSIS */}
        {/* ============================================================ */}
        <section className="report-page-card rounded-2xl border border-[#E3E8E5] bg-white p-8 sm:p-12 shadow-sm">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#147D72] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                  Acoustic Biomarker Suite
                </span>
                <h2 className="text-xl font-black tracking-tight text-[#173B38]">
                  Page 4 — Detailed Speech Biomarker Analysis
                </h2>
              </div>
              <span className="rounded-full bg-[#E8F3F0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#147D72]">
                Page 4 of 6
              </span>
            </div>

            <p className="mt-4 text-xs text-[#6B7D79]">
              This section contains the comprehensive technical acoustic measurements extracted from conversational recordings, including Speaking Rate, Pause Density, Lexical Diversity (TTR), and baseline comparison differentials.
            </p>

            {/* Detailed Biomarker Comparison Table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-[#E3E8E5]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E3E8E5] bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  <tr>
                    <th className="px-3.5 py-3">Biomarker Metric</th>
                    <th className="px-3 py-3">Measurement Unit</th>
                    <th className="px-3 py-3 text-right">Latest Value</th>
                    <th className="px-3 py-3 text-right">Personal Baseline</th>
                    <th className="px-3 py-3 text-right">Change (% / Diff)</th>
                    <th className="px-3.5 py-3">Clinical Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8E5] text-[#173B38]">
                  {biomarkerRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-xs text-[#6B7D79]">
                        No completed check-in sessions with acoustic extraction available.
                      </td>
                    </tr>
                  ) : (
                    biomarkerRows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-[#FAF8F5]" : "bg-white"}>
                        <td className="px-3.5 py-3 font-bold text-[#173B38]">{row.name}</td>
                        <td className="px-3 py-3 text-[11px] text-[#6B7D79]">{row.unit}</td>
                        <td className="px-3 py-3 text-right font-bold text-[#173B38]">{row.current}</td>
                        <td className="px-3 py-3 text-right text-[#4D635F]">{row.baseline}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#173B38]">{row.diff}</td>
                        <td className="px-3.5 py-3 text-[11px] text-[#4D635F]">{row.interpretation}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Biomarker Definitions & Clinical Explanations */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#147D72]">
                  Speaking Rate (WPM)
                </span>
                <p className="mt-1 text-xs text-[#173B38] leading-relaxed">
                  Words articulated per minute during active speech segments. Quantifies articulatory speed and verbal fluency relative to individual baseline tempo.
                </p>
              </div>

              <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#147D72]">
                  Pause Density
                </span>
                <p className="mt-1 text-xs text-[#173B38] leading-relaxed">
                  The ratio of silent hesitation intervals to active phonation. Significant elevation may indicate increased cognitive planning pauses or conversational hesitation.
                </p>
              </div>

              <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#147D72]">
                  Vocabulary Diversity (TTR)
                </span>
                <p className="mt-1 text-xs text-[#173B38] leading-relaxed">
                  Type-Token Ratio measures lexical variety across unique words. Tracks expressiveness and semantic richness during spontaneous storytelling.
                </p>
              </div>
            </div>
          </div>

          {/* Page 4 Footer */}
          <div className="mt-8 border-t border-[#E3E8E5] pt-4 flex items-center justify-between text-[10px] text-[#6B7D79]">
            <span>Patient: {elder.display_name} • Kahaani-Check Clinical Dossier</span>
            <span>Page 4 of 6</span>
          </div>
        </section>

        {/* ============================================================ */}
        {/* PAGE 5: SESSION-BY-SESSION SUMMARY */}
        {/* ============================================================ */}
        <section className="report-page-card rounded-2xl border border-[#E3E8E5] bg-white p-8 sm:p-12 shadow-sm">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#147D72] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                  Check-in Audit Trail
                </span>
                <h2 className="text-xl font-black tracking-tight text-[#173B38]">
                  Page 5 — Session-by-Session Historical Summary
                </h2>
              </div>
              <span className="rounded-full bg-[#E8F3F0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#147D72]">
                Page 5 of 6
              </span>
            </div>

            <p className="mt-4 text-xs text-[#6B7D79]">
              A complete chronological breakdown of each completed voice check-in, detailing the overall interpretation, observed speech parameters, and alert determinations.
            </p>

            {/* Session Audit Table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-[#E3E8E5]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E3E8E5] bg-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  <tr>
                    <th className="px-3.5 py-2.5">Session / Date</th>
                    <th className="px-3 py-2.5">Interpretation</th>
                    <th className="px-3.5 py-2.5">Significant Changes</th>
                    <th className="px-3 py-2.5">Alert Status</th>
                    <th className="px-3.5 py-2.5 text-right">Supporting Measurements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8E5] text-[#173B38]">
                  {sortedObs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#6B7D79]">
                        No check-in session records cataloged for this elder yet.
                      </td>
                    </tr>
                  ) : (
                    [...sortedObs].reverse().map((item, idx) => {
                      const sessionNum = sortedObs.length - idx;
                      const hasShift =
                        item.overall_status === "change_detected" ||
                        item.overall_status === "attention_required";
                      return (
                        <tr key={idx} className={idx % 2 === 1 ? "bg-[#FAF8F5]" : "bg-white"}>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className="font-bold text-[#173B38]">Session #{sessionNum}</span>
                            <p className="text-[10px] text-[#6B7D79]">{formatDate(item.recorded_at)}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-[#173B38]">
                              {hasShift ? "Speech pattern shift detected" : "Consistent with personal baseline"}
                            </span>
                            {item.transcript?.language && (
                              <p className="text-[10px] text-[#6B7D79]">
                                Language: {item.transcript.language.toUpperCase()}
                              </p>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-[11px] text-[#4D635F]">
                            {item.previous_session_comparison?.session_label ||
                              (hasShift ? "Shift noted from baseline" : "Stable flow vs baseline")}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                hasShift
                                  ? "bg-[#FEF3C7] text-[#B45309]"
                                  : "bg-[#DCFCE7] text-[#15803D]"
                              }`}
                            >
                              {hasShift ? "Attention Required" : "Stable"}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-medium text-[11px] text-[#173B38]">
                            {item.features?.speaking_rate_wpm ? `${Math.round(item.features.speaking_rate_wpm)} WPM` : "—"}
                            {item.features?.pause_density ? ` • Pause ${item.features.pause_density.toFixed(2)}` : ""}
                            {item.features?.lexical_diversity_ttr ? ` • TTR ${item.features.lexical_diversity_ttr.toFixed(2)}` : ""}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Longitudinal Summary Note */}
            <div className="mt-6 rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-4 text-xs text-[#6B7D79]">
              <p>
                * Check-in sessions are recorded via automated telephone calls or caregiver tablet interface. Acoustic features are computed in real time by the speech processing pipeline and logged longitudinally.
              </p>
            </div>
          </div>

          {/* Page 5 Footer */}
          <div className="mt-8 border-t border-[#E3E8E5] pt-4 flex items-center justify-between text-[10px] text-[#6B7D79]">
            <span>Patient: {elder.display_name} • Kahaani-Check Clinical Dossier</span>
            <span>Page 5 of 6</span>
          </div>
        </section>

        {/* ============================================================ */}
        {/* PAGE 6: CLINICAL REVIEW SECTION */}
        {/* ============================================================ */}
        <section className="report-page-card rounded-2xl border border-[#E3E8E5] bg-white p-8 sm:p-12 shadow-sm">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#147D72] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                  Clinician Sign-off & Correlation
                </span>
                <h2 className="text-xl font-black tracking-tight text-[#173B38]">
                  Page 6 — Clinical Review & Clinician Notes
                </h2>
              </div>
              <span className="rounded-full bg-[#E8F3F0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#147D72]">
                Page 6 of 6
              </span>
            </div>

            {/* Informal Caregiver Observations if present */}
            {caregiverNotes.trim() && (
              <div className="mt-5 rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-4 text-xs">
                <h4 className="font-bold text-[#173B38] mb-1">Caregiver Family Notes:</h4>
                <p className="text-[#4D635F] whitespace-pre-wrap leading-relaxed">{caregiverNotes}</p>
              </div>
            )}

            {/* Doctor/Clinician Notes with large writing area */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#173B38]">
                  Doctor / Clinician Notes
                </h3>
                <span className="text-[10px] text-[#6B7D79]">
                  Reserved for clinician documentation & follow-up plans
                </span>
              </div>

              <div className="mt-3 min-h-[220px] rounded-xl border-2 border-dashed border-[#C8DFD9] bg-[#FCFDFD] p-5">
                <p className="text-[11px] italic text-[#8F9E9B]">
                  Record clinical impressions, observations, differential considerations, and recommended actions:
                </p>
                <div className="mt-4 space-y-6">
                  <div className="border-b border-[#E3E8E5] pb-1" />
                  <div className="border-b border-[#E3E8E5] pb-1" />
                  <div className="border-b border-[#E3E8E5] pb-1" />
                  <div className="border-b border-[#E3E8E5] pb-1" />
                  <div className="border-b border-[#E3E8E5] pb-1" />
                  <div className="border-b border-[#E3E8E5] pb-1" />
                </div>
              </div>
            </div>

            {/* Clinical Review Formal Sign-off Block */}
            <div className="mt-8 rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                Clinical Review
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                    Reviewed by (Physician / Clinician Name & Title)
                  </label>
                  <div className="mt-1 border-b border-[#173B38] pb-1">
                    <span className="text-xs text-[#173B38]">&nbsp;</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                    Date of Review
                  </label>
                  <div className="mt-1 border-b border-[#173B38] pb-1">
                    <span className="text-xs text-[#173B38]">&nbsp;</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                  Additional Observations & Recommendations
                </label>
                <div className="mt-1 border-b border-[#173B38] pb-1">
                  <span className="text-xs text-[#173B38]">&nbsp;</span>
                </div>
              </div>

              <div className="mt-6 flex justify-between pt-2 text-xs text-[#6B7D79]">
                <span>Physician Signature: _____________________________________</span>
                <span>Registration / License #: ______________________</span>
              </div>
            </div>

            {/* Safety & Non-Diagnostic Disclaimer */}
            <div className="mt-8 rounded-xl border border-[#C8DFD9] bg-[#F4FAF8] p-4">
              <div className="flex items-start gap-2.5">
                <Shield size={16} className="mt-0.5 shrink-0 text-[#147D72]" />
                <div className="text-[11px] leading-relaxed text-[#4D635F]">
                  <strong className="text-[#173B38]">Clinical Advisory & Disclaimer:</strong> Kahaani-Check is a supportive speech-observation and monitoring tool designed to track acoustic deviations relative to personal baselines. Outputs do not constitute a medical diagnosis, clinical confirmation, or treatment plan. Findings should be interpreted by qualified medical practitioners in conjunction with direct clinical evaluation, patient history, and standard diagnostic modalities.
                </div>
              </div>
            </div>
          </div>

          {/* Page 6 Footer */}
          <div className="mt-8 border-t border-[#E3E8E5] pt-4 flex items-center justify-between text-[10px] text-[#6B7D79]">
            <span>Patient: {elder.display_name} • Kahaani-Check Clinical Dossier</span>
            <span>Page 6 of 6</span>
          </div>
        </section>
      </div>
    </div>
  );
}
