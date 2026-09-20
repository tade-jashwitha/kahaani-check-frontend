"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  TrendingUp,
  Clock,
  Users,
  Mic,
  Loader2,
  Info,
  Shield,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  X,
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

import PageContainer from "@/app/components/ui/PageContainer";
import PageHeader from "@/app/components/ui/PageHeader";
import Badge from "@/app/components/ui/Badge";
import EmptyState from "@/app/components/ui/EmptyState";
import Button from "@/app/components/ui/Button";
import { apiFetch } from "@/app/lib/api";
import { useAlerts } from "@/app/features/alerts/hooks";
import DoctorReportView, {
  type DoctorReportElder,
  type DoctorReportBaseline,
  type DoctorReportObservation,
  type DoctorReportCaregiverSummary,
} from "@/app/components/reports/DoctorReportView";
import type { Alert } from "@/app/features/alerts/types";

interface BackendElder {
  id: string;
  display_name: string;
  phone_e164?: string;
  preferred_call_language?: string;
  dob_year_range?: string | null;
  timezone?: string;
  status?: string;
  created_at?: string;
}

interface TrajectoryPoint {
  date: string;
  speakingRate: number | null;
  pauseDensity: number | null;
  lexicalDiversity: number | null;
  speechDuration?: number | null;
  status: string;
  stabilityIndex: number;
  transcript?: {
    id?: string;
    text: string;
    language?: string;
    confidence?: number;
  } | null;
  biomarkerComparisons?: Record<string, unknown> | null;
  previousSessionComparison?: {
    speaking_rate_diff?: number | null;
    pause_density_diff?: number | null;
    lexical_diversity_diff?: number | null;
    session_label?: string;
  } | null;
}

interface TrajectoryResponse {
  elder_id?: string;
  status?: string;
  observation_count?: number;
  baseline?: DoctorReportBaseline | null;
  baseline_progress?: {
    completed: number;
    required: number;
    ready: boolean;
  };
  caregiver_summary?: DoctorReportCaregiverSummary | null;
  observations?: DoctorReportObservation[];
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatFullDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Normalizes observations into simple longitudinal data points.
 * Calculates an intuitive Stability / Wellness Index (0–100) representing
 * how closely recent conversational speech matches the person's baseline pattern,
 * avoiding raw acoustic numbers on the user dashboard.
 */
function normalizeTrajectory(response: unknown): TrajectoryPoint[] {
  if (!response || typeof response !== "object") return [];
  const object = response as Record<string, unknown>;
  const observations = Array.isArray(object.observations) ? object.observations : [];
  const points: TrajectoryPoint[] = [];

  for (const observation of observations) {
    if (!observation || typeof observation !== "object") continue;
    const item = observation as Record<string, unknown>;
    const features = (item.features && typeof item.features === "object" ? item.features : {}) as Record<string, unknown>;
    const recordedAt = typeof item.recorded_at === "string" ? item.recorded_at : null;
    if (!recordedAt) continue;

    const speakingRate = typeof features.speaking_rate_wpm === "number" ? features.speaking_rate_wpm : null;
    const pauseDensity = typeof features.pause_density === "number" ? features.pause_density : null;
    const lexicalDiversity = typeof features.lexical_diversity_ttr === "number" ? features.lexical_diversity_ttr : null;
    const speechDuration = typeof features.speech_duration_seconds === "number" ? features.speech_duration_seconds : null;
    const status = typeof item.overall_status === "string" ? item.overall_status : "stable";

    const rawTranscript = (item.transcript && typeof item.transcript === "object" ? item.transcript : null) as Record<string, unknown> | null;
    const transcript = rawTranscript && typeof rawTranscript.text === "string" && rawTranscript.text.trim()
      ? {
          id: typeof rawTranscript.id === "string" ? rawTranscript.id : undefined,
          text: rawTranscript.text,
          language: typeof rawTranscript.language === "string" ? rawTranscript.language : "unknown",
          confidence: typeof rawTranscript.confidence === "number" ? rawTranscript.confidence : undefined,
        }
      : null;

    const biomarkerComparisons = (item.biomarker_comparisons && typeof item.biomarker_comparisons === "object"
      ? item.biomarker_comparisons
      : null) as Record<string, unknown> | null;

    const previousSessionComparison = (item.previous_session_comparison && typeof item.previous_session_comparison === "object"
      ? item.previous_session_comparison
      : null) as TrajectoryPoint["previousSessionComparison"];

    // Compute non-technical Stability Index (0-100)
    let stabilityIndex = 92;
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes("change") || normalizedStatus.includes("attention") || normalizedStatus.includes("deviat")) {
      stabilityIndex = 68;
    } else if (normalizedStatus.includes("collect") || normalizedStatus.includes("calibrat")) {
      stabilityIndex = 88;
    } else {
      // Typical/stable
      stabilityIndex = 94;
    }

    points.push({
      date: recordedAt,
      speakingRate,
      pauseDensity,
      lexicalDiversity,
      speechDuration,
      status,
      stabilityIndex,
      transcript,
      biomarkerComparisons,
      previousSessionComparison,
    });
  }

  points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return points;
}

export default function InsightsPage() {
  const [elders, setElders] = useState<BackendElder[]>([]);
  const [selectedElderId, setSelectedElderId] = useState<string>("");
  const [timeRange, setTimeRange] = useState<"all" | "90d" | "30d">("all");
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingElders, setLoadingElders] = useState(true);
  const [showDoctorReportModal, setShowDoctorReportModal] = useState(false);
  const [selectedDetailAlert, setSelectedDetailAlert] = useState<Alert | null>(null);

  // Global alerts hook for synchronized resolution state
  const { alerts, resolveAlert, resolvingIds } = useAlerts();

  // 1. Load elders list
  useEffect(() => {
    async function loadElders() {
      try {
        setLoadingElders(true);
        const data = await apiFetch("/v1/elders");
        const list = (Array.isArray(data) ? data : (data as { elders?: BackendElder[] })?.elders || []) as BackendElder[];
        setElders(list);
        if (list.length > 0 && !selectedElderId) {
          const urlParam = typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("elder") || new URLSearchParams(window.location.search).get("elder_id")
            : null;
          const match = urlParam ? list.find((e) => e.id === urlParam) : null;
          if (match) {
            setSelectedElderId(match.id);
          } else {
            const activeElder = list.find((e) => e.display_name?.toLowerCase() === "aasritha") || list[0];
            setSelectedElderId(activeElder.id);
          }
        }
      } catch (err) {
        console.error("Failed to load elders:", err);
      } finally {
        setLoadingElders(false);
      }
    }
    loadElders();
  }, [selectedElderId]);

  // 2. Load trajectory for selected elder
  useEffect(() => {
    async function loadElderTrajectory() {
      if (!selectedElderId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const trajRes = await apiFetch(`/v1/elders/${selectedElderId}/trajectory`);
        setTrajectory(trajRes as TrajectoryResponse);
      } catch (err) {
        console.error("Failed to load trajectory:", err);
        setTrajectory(null);
      } finally {
        setLoading(false);
      }
    }
    loadElderTrajectory();
  }, [selectedElderId]);

  const selectedElder = useMemo(() => {
    return elders.find((e) => e.id === selectedElderId) || null;
  }, [elders, selectedElderId]);

  const chartData = useMemo(() => normalizeTrajectory(trajectory), [trajectory]);
  const baseline = trajectory?.baseline ?? null;
  const caregiverSummary = trajectory?.caregiver_summary ?? null;
  const isBaselineReady = trajectory?.baseline_progress?.ready || Boolean(baseline);
  const latestPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const firstPoint = chartData.length > 0 ? chartData[0] : null;

  // Filter trajectory points by time range
  const filteredData = useMemo(() => {
    if (timeRange === "all" || chartData.length === 0) return chartData;
    const now = new Date().getTime();
    const daysLimit = timeRange === "30d" ? 30 : 90;
    const cutoff = now - daysLimit * 24 * 60 * 60 * 1000;
    return chartData.filter((item) => new Date(item.date).getTime() >= cutoff);
  }, [chartData, timeRange]);

  // Elder-specific alerts
  const elderAlerts = useMemo(() => {
    return alerts.filter((a) => a.elder_id === selectedElderId);
  }, [alerts, selectedElderId]);

  const activeAlerts = useMemo(() => {
    return elderAlerts.filter((a) => !a.resolved);
  }, [elderAlerts]);

  // Monitoring period string
  const monitoringPeriodStr = useMemo(() => {
    if (!firstPoint?.date || !latestPoint?.date) {
      return "Initial monitoring phase";
    }
    const s = formatDate(firstPoint.date);
    const e = formatDate(latestPoint.date);
    return s === e ? s : `${s} – ${e}`;
  }, [firstPoint, latestPoint]);

  // ============================================================
  // STRICT SEPARATION: Analytical State vs Alert State
  // ============================================================
  // Analytical state = what the underlying speech analysis currently indicates.
  // Alert state = whether the caregiver has acknowledged the alert.
  // Marking Done NEVER falsely changes analytical state to Steady if deviation exists!
  const analyticalStatus = useMemo(() => {
    const rawStatus = (trajectory?.status || "").toLowerCase();
    const hasDeviation =
      rawStatus.includes("change") ||
      rawStatus.includes("attention") ||
      rawStatus.includes("deviat");

    // Case 1: Insufficient baseline calibration (< 3 sessions)
    if (!isBaselineReady || rawStatus.includes("collect") || rawStatus.includes("calibrat")) {
      return {
        type: "calibration" as const,
        label: "Calibration in progress",
        subLabel: "Baseline Establishment",
        message:
          "We're learning this person's usual speech pattern. More voice sessions are needed before changes can be compared reliably.",
        badgeVariant: "teal" as const,
        themeBorder: "border-[#99F6E4]",
        themeBg: "bg-gradient-to-br from-[#F0FDFA] via-white to-[#CCFBF1]/30",
        pillBg: "bg-[#0F766E] text-white",
        iconColor: "text-[#0F766E]",
      };
    }

    // Case 2: Analytical deviation exists (regardless of whether caregiver clicked Done)
    if (hasDeviation) {
      return {
        type: "attention" as const,
        label: "Variation Noted",
        subLabel: "Personal Baseline Comparison",
        message:
          "Recent speech patterns show a notable variation from the established baseline.",
        badgeVariant: "amber" as const,
        themeBorder: "border-[#FCD34D]",
        themeBg: "bg-gradient-to-br from-[#FFFBEB] via-white to-[#FEF3C7]/40",
        pillBg: "bg-[#D97706] text-white",
        iconColor: "text-[#D97706]",
      };
    }

    // Case 3: Steady / consistent speech patterns
    return {
      type: "steady" as const,
      label: "Steady",
      subLabel: "Personal Baseline Comparison",
      message:
        "Recent speech patterns are consistent with the established baseline.",
      badgeVariant: "green" as const,
      themeBorder: "border-[#86EFAC]",
      themeBg: "bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7]/30",
      pillBg: "bg-[#15803D] text-white",
      iconColor: "text-[#15803D]",
    };
  }, [trajectory?.status, isBaselineReady]);

  // Recent observation interpretation text
  const recentObservationText = useMemo(() => {
    if (chartData.length === 0) {
      return "No check-in recordings available yet to formulate longitudinal speech observations.";
    }
    if (analyticalStatus.type === "calibration") {
      return "Collecting initial conversational voice check-ins to build a personalized baseline.";
    }
    if (analyticalStatus.type === "attention") {
      return "A noticeable change in speech patterns was detected compared with the person's usual pattern.";
    }
    return "Your recent speech pattern is generally consistent with your previous recordings.";
  }, [chartData.length, analyticalStatus.type]);

  // Non-technical sanitized observations for user dashboard
  const userFriendlyObservations = useMemo(() => {
    const list = caregiverSummary?.key_observations || [];
    return list.map((obs) => {
      if (/(\d+\s*wpm|\bpause\s*density\b|\bttr\b|\bhi\b|\bz-score\b)/i.test(obs)) {
        return "Conversational flow and vocal pacing are tracked against individual baseline.";
      }
      return obs;
    });
  }, [caregiverSummary?.key_observations]);

  const handleDownloadReport = () => {
    if (typeof window !== "undefined" && selectedElderId) {
      window.open(`/dashboard/elders/${selectedElderId}/report?download=true`, "_blank");
    }
  };

  return (
    <PageContainer>
      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
              Longitudinal Wellness
            </span>
            <Badge
              variant={
                analyticalStatus.type === "steady"
                  ? "green"
                  : analyticalStatus.type === "attention"
                  ? "orange"
                  : "teal"
              }
            >
              {analyticalStatus.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#173B38] sm:text-3xl">
            Voice & Wellness Insights
          </h1>
          <p className="mt-1 text-xs text-[#6B7D79] max-w-2xl leading-relaxed">
            Simple, doctor-friendly longitudinal speech pattern tracking and non-invasive wellness monitoring.
          </p>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDoctorReportModal(true)}
            icon={<FileText size={15} />}
          >
            View Doctor Report
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadReport}
            icon={<Printer size={15} />}
          >
            Download Report
          </Button>
        </div>
      </div>

      {/* ── 2. CONTROLS: ELDER SELECTOR & TIME RANGE ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Elder Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {elders.map((elder) => (
            <button
              key={elder.id}
              type="button"
              onClick={() => setSelectedElderId(elder.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                selectedElderId === elder.id
                  ? "bg-[#147D72] text-white shadow-sm"
                  : "border border-[#E3E8E5] bg-white text-[#6B7D79] hover:bg-[#F8F6F0]"
              }`}
            >
              {elder.display_name}
            </button>
          ))}
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-[#E3E8E5] bg-white p-1">
          <button
            type="button"
            onClick={() => setTimeRange("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              timeRange === "all" ? "bg-[#147D72] text-white" : "text-[#6B7D79] hover:text-[#173B38]"
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("90d")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              timeRange === "90d" ? "bg-[#147D72] text-white" : "text-[#6B7D79] hover:text-[#173B38]"
            }`}
          >
            Past 90 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("30d")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              timeRange === "30d" ? "bg-[#147D72] text-white" : "text-[#6B7D79] hover:text-[#173B38]"
            }`}
          >
            Past 30 Days
          </button>
        </div>
      </div>

      {/* ── 3. MAIN CONTENT BODY ── */}
      {loading || loadingElders ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-[#E3E8E5] bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-[#147D72]" />
        </div>
      ) : elders.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="No family elders found"
          description="Add a family member to start tracking longitudinal speech patterns and wellness trends."
          action={
            <Link href="/dashboard/elders/new">
              <Button variant="primary">Add Family Member</Button>
            </Link>
          }
        />
      ) : chartData.length === 0 ? (
        <div className="rounded-2xl border border-[#E3E8E5] bg-white p-12 text-center max-w-xl mx-auto shadow-sm my-8">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F3F0] flex items-center justify-center mx-auto mb-4 text-[#147D72]">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#173B38]">
            No completed check-ins yet for {selectedElder?.display_name || "this elder"}
          </h3>
          <p className="mt-2 text-sm text-[#6B7D79] leading-relaxed">
            Speech pattern tracking and longitudinal wellness insights will appear here once weekly voice check-ins are recorded.
          </p>
          <div className="mt-6">
            <Link href={`/dashboard/elders/${selectedElderId}/checkins`}>
              <Button variant="primary" icon={<Mic className="w-4 h-4" />}>
                Start Voice Check-in
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* SECTION 1: CURRENT STATUS CARD (ANALYTICAL STATE) */}
          {/* ============================================================ */}
          <section
            className={`rounded-2xl border ${analyticalStatus.themeBorder} ${analyticalStatus.themeBg} p-6 shadow-sm transition`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  {analyticalStatus.type === "steady" ? (
                    <CheckCircle2 className="h-6 w-6 text-[#15803D]" />
                  ) : analyticalStatus.type === "attention" ? (
                    <AlertTriangle className="h-6 w-6 text-[#D97706]" />
                  ) : (
                    <Activity className="h-6 w-6 text-[#0F766E]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${analyticalStatus.pillBg}`}>
                      {analyticalStatus.label}
                    </span>
                    <span className="text-xs text-[#6B7D79]">
                      {analyticalStatus.subLabel}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-bold text-[#173B38] sm:text-xl">
                    {analyticalStatus.message}
                  </h2>
                  <p className="mt-1 text-xs text-[#6B7D79] leading-relaxed">
                    {caregiverSummary?.longitudinal_direction ||
                      "Continuous tracking of natural vocal pacing and conversational rhythm against individual history."}
                  </p>
                </div>
              </div>

              {/* Status Action */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDoctorReportModal(true)}
                  className="rounded-xl border border-[#E3E8E5] bg-white px-3.5 py-2 text-xs font-semibold text-[#173B38] shadow-sm hover:bg-[#FAF8F5] transition"
                >
                  View Full Clinical Dossier
                </button>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* SECTION 2: OVERALL TREND GRAPH */}
          {/* ============================================================ */}
          <section className="rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#173B38] sm:text-base">
                  Overall Speech & Wellness Trend
                </h3>
                <p className="text-xs text-[#6B7D79]">
                  Monitoring Period: <strong className="text-[#173B38]">{monitoringPeriodStr}</strong> ({filteredData.length} sessions analyzed)
                </p>
              </div>

              {/* Graph Legend */}
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-[#147D72] font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#147D72]" />
                  Observed Speech Pattern
                </span>
                <span className="flex items-center gap-1.5 text-[#A86A43] font-medium">
                  <span className="h-2 w-4 border-b-2 border-dashed border-[#A86A43]" />
                  Typical Personal Range
                </span>
              </div>
            </div>

            {/* Simple Line Graph */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#F0EFEA" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: "#6B7D79" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[50, 100]}
                    ticks={[60, 75, 90, 100]}
                    tickFormatter={(v) => (v >= 85 ? "Steady" : v >= 70 ? "Mild Var" : "Review")}
                    tick={{ fontSize: 10, fill: "#6B7D79" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(d) => formatDate(String(d))}
                    formatter={(val: unknown) => [
                      typeof val === "number" && val >= 85
                        ? "Consistent with personal baseline"
                        : "Speech pattern variation detected",
                      "Pattern Status",
                    ]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #E3E8E5",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine
                    y={90}
                    stroke="#A86A43"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="stabilityIndex"
                    name="Speech Pattern Index"
                    stroke="#147D72"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#147D72" }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-[#F0EFEA] pt-2 text-[11px] text-[#6B7D79]">
              <span>Graph represents overall vocal pattern consistency relative to personal historical norms.</span>
              <span className="hidden sm:inline">Technical acoustic units are detailed in the Doctor Report.</span>
            </div>
          </section>

          {/* ============================================================ */}
          {/* SECTION 3: RECENT OBSERVATION & SECTION 4: MONITORING SUMMARY */}
          {/* ============================================================ */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 3. RECENT OBSERVATION */}
            <section className="rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-[#147D72]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                    Recent Observation
                  </h3>
                </div>

                <p className="text-sm font-bold text-[#173B38] leading-snug">
                  {recentObservationText}
                </p>

                {/* Key Observations bullet points in plain language (no raw technical numbers) */}
                <div className="mt-4 space-y-2">
                  {userFriendlyObservations.length > 0 ? (
                    userFriendlyObservations.map((obs, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#4D635F]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#147D72]" />
                        <span>{obs}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#6B7D79]">
                      Speech rhythms and conversational pacing are being cataloged with each completed session.
                    </p>
                  )}
                </div>
              </div>

              {latestPoint?.date && (
                <div className="mt-5 border-t border-[#E3E8E5] pt-3 text-[11px] text-[#6B7D79]">
                  Last analyzed session recorded on <strong>{formatFullDate(latestPoint.date)}</strong>
                </div>
              )}
            </section>

            {/* 4. MONITORING SUMMARY GRID (ALERT STATE SEPARATE) */}
            <section className="rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#147D72] mb-4">
                Monitoring Summary
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* 1. Period */}
                <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-3.5">
                  <div className="flex items-center gap-1.5 text-[#6B7D79] mb-1">
                    <Calendar size={13} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Monitoring Period
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#173B38] sm:text-sm">
                    {monitoringPeriodStr}
                  </p>
                </div>

                {/* 2. Sessions */}
                <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-3.5">
                  <div className="flex items-center gap-1.5 text-[#6B7D79] mb-1">
                    <Activity size={13} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Sessions Analyzed
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#173B38] sm:text-sm">
                    {chartData.length} Completed
                  </p>
                </div>

                {/* 3. Number of unresolved alerts (Alert state) */}
                <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-3.5">
                  <div className="flex items-center gap-1.5 text-[#6B7D79] mb-1">
                    <AlertTriangle size={13} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Active Alerts
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#173B38] sm:text-sm">
                    {activeAlerts.length === 0 ? "0 Active" : `${activeAlerts.length} Unresolved`}
                  </p>
                </div>

                {/* 4. Last check-in date */}
                <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-3.5">
                  <div className="flex items-center gap-1.5 text-[#6B7D79] mb-1">
                    <Clock size={13} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Last Check-in
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#173B38] sm:text-sm">
                    {formatDate(latestPoint?.date)}
                  </p>
                </div>
              </div>

              {/* Baseline progress banner */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#E8F3F0] p-3 text-xs text-[#147D72]">
                <span className="font-semibold">
                  {isBaselineReady
                    ? `Personal Baseline established (${baseline?.sample_count ?? chartData.length} sessions)`
                    : `Calibrating baseline (${chartData.length}/3 sessions)`}
                </span>
                <Badge variant="teal">
                  {isBaselineReady ? "Baseline Active" : "Calibrating"}
                </Badge>
              </div>
            </section>
          </div>

          {/* ============================================================ */}
          {/* SECTION 5: ALERT SECTION */}
          {/* ============================================================ */}
          <section className="rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                Alerts & Notifications
              </h3>
              <Link
                href="/dashboard/alerts"
                className="text-xs font-semibold text-[#147D72] hover:underline flex items-center gap-1"
              >
                <span>View All Alerts</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#86EFAC] bg-[#F0FDF4] p-4 text-[#15803D]">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-xs font-bold">
                    {analyticalStatus.type === "attention"
                      ? "Alerts acknowledged"
                      : "No active alerts requiring attention"}
                  </p>
                  <p className="text-[11px] text-[#4D635F]">
                    {analyticalStatus.type === "attention"
                      ? `Alert notifications have been marked Done. Speech pattern variations remain cataloged in the longitudinal record for clinician review.`
                      : `All monitored speech markers remain within ${selectedElder?.display_name || "the person"}'s established baseline range.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alert) => {
                  const isScheduled =
                    alert.message.toLowerCase().includes("scheduled") ||
                    (alert.detail || "").toLowerCase().includes("scheduled");
                  return (
                    <div
                      key={alert.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-4 text-[#173B38]"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-[#D97706] mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[#D97706] px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                              {isScheduled ? "SCHEDULED CHECK-IN" : "REVIEW"}
                            </span>
                            <span className="text-[11px] text-[#6B7D79]">
                              {formatDate(alert.created_at)}
                            </span>
                          </div>
                          <h4 className="mt-1 text-xs font-bold text-[#173B38]">
                            {isScheduled
                              ? alert.message
                              : "Speech Pattern Variation Noted"}
                          </h4>
                          <p className="mt-0.5 text-[11px] text-[#6B7D79] leading-relaxed">
                            {isScheduled
                              ? alert.detail || "A voice session is scheduled for today."
                              : "Recent speech patterns differ from the person's established personal baseline."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {!isScheduled && (
                          <button
                            type="button"
                            onClick={() => setSelectedDetailAlert(alert)}
                            className="rounded-xl border border-[#147D72] bg-[#E8F3F0] px-3 py-1.5 text-xs font-semibold text-[#147D72] hover:bg-[#D5EAE4] transition"
                          >
                            Review Details
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={resolvingIds.includes(alert.id)}
                          onClick={() => resolveAlert(alert.id)}
                          className="flex items-center gap-1 rounded-xl bg-[#147D72] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#105E57] transition disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} />
                          <span>{resolvingIds.includes(alert.id) ? "Updating..." : "Done"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* SECTION 6: DOCTOR REPORT CALLOUT & BUTTONS */}
          {/* ============================================================ */}
          <section className="rounded-2xl border border-[#C8DFD9] bg-gradient-to-br from-[#F4FAF8] via-white to-[#FAF6EE] p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} className="text-[#147D72]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                    Doctor Longitudinal Report
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#173B38]">
                  Evidence-Based Clinical Report Ready for Physician Consultation
                </h3>
                <p className="mt-1 text-xs text-[#6B7D79] leading-relaxed">
                  The Doctor Report includes detailed technical acoustic features (Speaking Rate, Pause Density, Lexical Diversity / TTR), longitudinal trend plots, session audits, and clinician sign-off notes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  variant="primary"
                  onClick={() => setShowDoctorReportModal(true)}
                  icon={<FileText size={15} />}
                >
                  View Doctor Report
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownloadReport}
                  icon={<Printer size={15} />}
                >
                  Download Report
                </Button>
              </div>
            </div>
          </section>

          {/* CLINICAL ADVISORY FOOTER */}
          <footer className="rounded-2xl border border-[#E3E8E5] bg-[#F8F6F0] p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-[#6B7D79]">
              <Shield size={14} className="text-[#147D72] shrink-0" />
              <p>
                <strong>Clinical Advisory:</strong> Kahaani-Check is a supportive speech-observation and monitoring tool. Observations do not constitute a medical diagnosis.
              </p>
            </div>
          </footer>
        </div>
      )}

      {/* ── 7. DOCTOR REPORT INTERACTIVE MODAL ── */}
      {showDoctorReportModal && selectedElder && (
        <DoctorReportView
          elder={selectedElder}
          trajectoryStatus={trajectory?.status}
          baseline={baseline}
          observations={trajectory?.observations || []}
          caregiverSummary={caregiverSummary}
          alerts={alerts}
          isModal={true}
          onClose={() => setShowDoctorReportModal(false)}
        />
      )}

      {/* ── 8. CAREGIVER ALERT DETAIL MODAL ── */}
      {selectedDetailAlert && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-xl sm:p-7">
            <div className="flex items-start justify-between border-b border-[#E3E8E5] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
                    Review Details
                  </span>
                  <h3 className="mt-1 text-base font-bold text-[#173B38]">
                    Speech Pattern Variation Noted
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailAlert(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#6B7D79] hover:bg-[#F8F6F0] hover:text-[#173B38] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E3E8E5] bg-[#FAF8F5] p-3.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                    Family Member
                  </span>
                  <p className="mt-0.5 font-bold text-[#173B38] text-sm">
                    {selectedDetailAlert.elder_name}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7D79]">
                    Observed At
                  </span>
                  <p className="mt-0.5 font-semibold text-[#173B38]">
                    {formatDate(selectedDetailAlert.created_at)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#147D72]">
                  Observation Summary
                </h4>
                <p className="mt-1 text-sm font-semibold text-[#173B38] leading-relaxed">
                  Recent speech patterns differ from the established personal baseline.
                </p>
                <p className="mt-1 text-xs text-[#6B7D79] leading-relaxed">
                  {selectedDetailAlert.detail ||
                    "Acoustic tempo and conversational pauses showed measurable variation compared with their historical voice recordings."}
                </p>
              </div>

              <div className="rounded-xl border border-[#C8DFD9] bg-[#F4FAF8] p-4 text-[#173B38]">
                <div className="flex items-center gap-1.5 font-bold text-[#147D72] mb-1">
                  <Info size={15} />
                  <span>Why this matters</span>
                </div>
                <p className="text-xs leading-relaxed text-[#4D635F]">
                  Changes in speech patterns can occur for many reasons, including fatigue, sleep changes, medication changes, stress, or other factors. This observation does not provide a diagnosis.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[#E3E8E5] pt-4">
              <button
                type="button"
                onClick={() => setSelectedDetailAlert(null)}
                className="rounded-xl border border-[#E3E8E5] bg-white px-4 py-2 text-xs font-semibold text-[#6B7D79] hover:bg-[#FAF8F5] transition"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetailAlert(null);
                    setShowDoctorReportModal(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[#147D72] bg-[#E8F3F0] px-3.5 py-2 text-xs font-semibold text-[#147D72] hover:bg-[#D5EAE4] transition"
                >
                  <FileText size={14} />
                  View Doctor Report
                </button>

                <button
                  type="button"
                  disabled={resolvingIds.includes(selectedDetailAlert.id)}
                  onClick={() => {
                    resolveAlert(selectedDetailAlert.id);
                    setSelectedDetailAlert(null);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-[#147D72] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105E57] transition disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  <span>{resolvingIds.includes(selectedDetailAlert.id) ? "Updating..." : "Done"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
