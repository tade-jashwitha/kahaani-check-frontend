"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Clock,
  Globe,
  Loader2,
  TrendingUp,
  FileText,
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
import SectionHeader from "@/app/components/ui/SectionHeader";
import Badge from "@/app/components/ui/Badge";
import Button from "@/app/components/ui/Button";
import EmptyState from "@/app/components/ui/EmptyState";
import { apiFetch } from "@/app/lib/api";

// ...


interface BiomarkerComparison {
  current_value: number | null;
  baseline_value: number | null;
  absolute_diff: number | null;
  percentage_diff: number | null;
  trend_direction: "higher" | "lower" | "typical" | "calibrating" | "unavailable";
  comparison_label: string;
  z_score: number | null;
  status: string;
}

interface BiomarkerComparisons {
  speaking_rate?: BiomarkerComparison;
  pause_density?: BiomarkerComparison;
  lexical_diversity?: BiomarkerComparison;
}

interface PreviousSessionComparison {
  speaking_rate_diff?: number | null;
  pause_density_diff?: number | null;
  lexical_diversity_diff?: number | null;
  session_label?: string;
}

interface TrajectoryPoint {
  date: string;
  speakingRate: number | null;
  pauseDensity: number | null;
  lexicalDiversity: number | null;
  speechDuration?: number | null;
  status: string;
  transcript?: {
    id?: string;
    text: string;
    language?: string;
    confidence?: number;
  } | null;
  biomarkerComparisons?: BiomarkerComparisons | null;
  previousSessionComparison?: PreviousSessionComparison | null;
}

interface Baseline {
  speaking_rate_mean: number | null;
  speaking_rate_stddev?: number | null;
  pause_density_mean: number | null;
  pause_density_stddev?: number | null;
  lexical_diversity_mean: number | null;
  lexical_diversity_stddev?: number | null;
  sample_count: number | null;
  created_at?: string;
}

interface TrajectoryResponse {
  elder_id?: string;
  status?: string;
  observation_count?: number;
  baseline?: Baseline | null;
  baseline_progress?: {
    completed: number;
    required: number;
    ready: boolean;
  };
  observations?: unknown[];
}

interface MetricChartProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  valueLabel: string;
  value: number | null;
  baseline: number | null;
  data: Array<{ date: string; value: number | null }>;
  formatter: (value: number) => string;
  lineColor: string;
  baselineColor: string;
}

function formatStatus(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Awaiting check-in data";
  }
  const normalized = value.toLowerCase();
  if (normalized.includes("baseline_collecting") || normalized.includes("collecting")) {
    return "Baseline calibration in progress";
  }
  if (normalized.includes("baseline_created")) {
    return "Personal baseline established";
  }
  if (normalized.includes("stable")) {
    return "Stable compared with baseline";
  }
  if (normalized.includes("change") || normalized.includes("review")) {
    return "Change worth reviewing";
  }
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

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
    const status = typeof item.overall_status === "string" ? item.overall_status : "Insufficient data";

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
      : null) as BiomarkerComparisons | null;

    const previousSessionComparison = (item.previous_session_comparison && typeof item.previous_session_comparison === "object"
      ? item.previous_session_comparison
      : null) as PreviousSessionComparison | null;

    points.push({
      date: recordedAt,
      speakingRate,
      pauseDensity,
      lexicalDiversity,
      speechDuration,
      status,
      transcript,
      biomarkerComparisons,
      previousSessionComparison,
    });
  }

  points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return points;
}

function MetricChart({
  title,
  description,
  icon,
  valueLabel,
  value,
  baseline,
  data,
  formatter,
  lineColor,
  baselineColor,
}: MetricChartProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#E3E8E5] bg-white p-5 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)]">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F3F0] text-[#147D72]">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#173B38]">{title}</h3>
              <p className="mt-0.5 max-w-xs text-xs text-[#6B7D79]">{description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8F9E9B]">
              Latest
            </p>
            <p className="mt-0.5 text-lg font-bold text-[#147D72]">
              {value !== null ? formatter(value) : "—"}
            </p>
          </div>
        </div>

        {/* CHART CONTAINER */}
        <div className="mt-4 rounded-xl border border-[#E3E8E5] bg-[#F8F6F0] p-3">
          {data.length > 0 ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#E3E8E5" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10, fill: "#6B7D79" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6B7D79" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    labelFormatter={(d) => formatDate(String(d))}
                    formatter={(val) => [typeof val === "number" ? formatter(val) : String(val), valueLabel]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #E3E8E5",
                      fontSize: "12px",
                    }}
                  />
                  {baseline !== null && (
                    <ReferenceLine
                      y={baseline}
                      stroke={baselineColor}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={valueLabel}
                    stroke={lineColor}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: lineColor }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-center">
              <div>
                <Activity size={20} className="mx-auto text-[#8F9E9B]" />
                <p className="mt-2 text-xs font-semibold text-[#6B7D79]">
                  Awaiting usable data
                </p>
                <p className="mt-0.5 text-[11px] text-[#8F9E9B]">
                  Check-ins will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BASELINE FOOTER */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F8F6F0] px-3.5 py-2.5 text-xs">
        <span className="text-[#6B7D79]">Personal Baseline</span>
        <span className="font-semibold text-[#147D72]">
          {baseline !== null ? formatter(baseline) : "Calibrating"}
        </span>
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const params = useParams();
  const elderId = String(params?.id ?? "");

  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrajectory() {
      if (!elderId) return;
      try {
        setLoading(true);
        setError("");
        const response = await apiFetch(`/v1/elders/${elderId}/trajectory`);
        setTrajectory(response as TrajectoryResponse);
      } catch (err) {
        console.error("Failed to load trajectory:", err);
        setError(err instanceof Error ? err.message : "Unable to load trajectory.");
      } finally {
        setLoading(false);
      }
    }

    loadTrajectory();
  }, [elderId]);

  const chartData = useMemo(() => normalizeTrajectory(trajectory), [trajectory]);
  const baseline = trajectory?.baseline ?? null;
  const overallStatus = formatStatus(trajectory?.status);
  const isBaselineReady = trajectory?.baseline_progress?.ready || Boolean(baseline);
  const observationCount = typeof trajectory?.observation_count === "number" ? trajectory.observation_count : chartData.length;
  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  const speakingRateData = chartData.map((item) => ({ date: item.date, value: item.speakingRate }));
  const pauseDensityData = chartData.map((item) => ({ date: item.date, value: item.pauseDensity }));
  const lexicalDiversityData = chartData.map((item) => ({ date: item.date, value: item.lexicalDiversity }));

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#147D72]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* PAGE HEADER */}
      <PageHeader
        title="Longitudinal Trends & Insights"
        subtitle="Tracking speech rate, pause patterns, and vocabulary richness over time"
        backHref={`/dashboard/elders/${elderId}`}
        backLabel="Elder Profile"
        badge={
          <Badge variant={isBaselineReady ? "green" : "teal"}>
            {overallStatus}
          </Badge>
        }
        actions={
          <Link href={`/dashboard/elders/${elderId}/report`}>
            <Button variant="primary" icon={<FileText size={15} />}>
              Export Doctor Report
            </Button>
          </Link>
        }
      />

      {/* ERROR */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#F2C5C0] bg-[#FBEAE8] p-4 text-[#C94A4A]">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* CURRENT TRAJECTORY HERO CARD */}
      <section className="mb-6 rounded-2xl border border-[#C8DFD9] bg-[#E8F3F0] p-6 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="teal" icon={<TrendingUp size={12} />}>
                Trajectory Analysis
              </Badge>
              <span className="text-xs text-[#6B7D79]">
                {observationCount} check-in{observationCount === 1 ? "" : "s"} reviewed
              </span>
            </div>

            <h2 className="mt-2 text-xl font-bold text-[#173B38]">
              {overallStatus}
            </h2>

            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6B7D79]">
              {isBaselineReady
                ? "Speech measures are compared with the elder's own personal baseline. Statistical deviations represent changes across multiple conversations."
                : "Personal baseline calibration in progress (3 check-ins required). Current observations are plotted below."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/elders/${elderId}/checkins`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#C8DFD9] bg-white px-4 py-2 text-xs font-semibold text-[#147D72] shadow-sm transition hover:bg-[#F8F6F0]"
            >
              <CalendarDays size={14} />
              Check-in History
            </Link>
          </div>
        </div>
      </section>

      {/* PERSONAL BASELINE OVERVIEW */}
      <section className="mb-8 rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E3E8E5]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#147D72]">
                Personal Baseline Reference
              </span>
              <Badge variant={isBaselineReady ? "green" : "teal"}>
                {isBaselineReady ? "Active Baseline" : "Calibrating (3 check-ins required)"}
              </Badge>
            </div>
            <h3 className="mt-1 text-base font-bold text-[#173B38]">
              Individual Acoustic Biomarker Baseline
            </h3>
            <p className="mt-0.5 text-xs text-[#6B7D79]">
              Every observation is evaluated strictly against this elder&apos;s own baseline. Individuals are never compared against one another.
            </p>
          </div>
          {baseline?.sample_count && (
            <div className="text-left sm:text-right">
              <span className="text-xs text-[#6B7D79]">Calibration Sample:</span>
              <p className="text-sm font-semibold text-[#173B38]">{baseline.sample_count} completed sessions</p>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#EBE8DF] bg-[#FAF9F5] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7D79]">Speaking Rate Baseline</span>
              <Activity size={16} className="text-[#147D72]" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#173B38]">
              {baseline?.speaking_rate_mean ? `${baseline.speaking_rate_mean.toFixed(0)} WPM` : "Calibrating..."}
            </p>
            <p className="mt-1 text-[11px] text-[#6B7D79]">
              {baseline?.speaking_rate_stddev ? `Typical variation: ±${baseline.speaking_rate_stddev.toFixed(1)} WPM` : "Establishing baseline range"}
            </p>
          </div>

          <div className="rounded-xl border border-[#EBE8DF] bg-[#FAF9F5] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7D79]">Pause Density Baseline</span>
              <Clock size={16} className="text-[#105E57]" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#173B38]">
              {baseline?.pause_density_mean ? baseline.pause_density_mean.toFixed(2) : "Calibrating..."}
            </p>
            <p className="mt-1 text-[11px] text-[#6B7D79]">
              {baseline?.pause_density_stddev ? `Typical variation: ±${baseline.pause_density_stddev.toFixed(2)}` : "Establishing baseline range"}
            </p>
          </div>

          <div className="rounded-xl border border-[#EBE8DF] bg-[#FAF9F5] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7D79]">Lexical Diversity Baseline</span>
              <Globe size={16} className="text-[#0D7267]" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#173B38]">
              {baseline?.lexical_diversity_mean ? baseline.lexical_diversity_mean.toFixed(2) : "Calibrating..."}
            </p>
            <p className="mt-1 text-[11px] text-[#6B7D79]">
              {baseline?.lexical_diversity_stddev ? `Typical variation: ±${baseline.lexical_diversity_stddev.toFixed(2)}` : "Establishing baseline range"}
            </p>
          </div>
        </div>
      </section>

      {/* 3 INTERACTIVE METRIC CHARTS */}
      <section className="mb-10">
        <SectionHeader
          title="Speech Pattern Longitudinal Trends"
          subtitle="Measurements plotted in chronological order. Dashed lines indicate personal baseline."
          className="mb-4"
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <MetricChart
            title="Speaking Rate"
            description="Words spoken per minute during free-flowing speech."
            icon={<Activity size={18} />}
            valueLabel="Speaking Rate"
            value={latest?.speakingRate ?? null}
            baseline={baseline?.speaking_rate_mean ?? null}
            data={speakingRateData}
            formatter={(v) => `${v.toFixed(0)} WPM`}
            lineColor="#147D72"
            baselineColor="#A86A43"
          />

          <MetricChart
            title="Pause Density"
            description="Proportion of silence and hesitations during dialogue."
            icon={<Clock size={18} />}
            valueLabel="Pause Density"
            value={latest?.pauseDensity ?? null}
            baseline={baseline?.pause_density_mean ?? null}
            data={pauseDensityData}
            formatter={(v) => v.toFixed(2)}
            lineColor="#105E57"
            baselineColor="#A86A43"
          />

          <MetricChart
            title="Lexical Diversity"
            description="Type-Token Ratio measuring vocabulary richness."
            icon={<Globe size={18} />}
            valueLabel="Lexical Diversity"
            value={latest?.lexicalDiversity ?? null}
            baseline={baseline?.lexical_diversity_mean ?? null}
            data={lexicalDiversityData}
            formatter={(v) => v.toFixed(2)}
            lineColor="#0D7267"
            baselineColor="#A86A43"
          />
        </div>
      </section>

      {/* CONVERSATION HISTORY LOG */}
      <section className="mb-8">
        <SectionHeader
          title="Processed Conversation History"
          subtitle="Longitudinal data points contributing to this elder's profile"
          className="mb-4"
        />

        {chartData.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={22} />}
            title="No processed conversations yet"
            description="Recorded weekly check-ins will contribute to longitudinal trend lines here."
          />
        ) : (
          <div className="divide-y divide-[#E3E8E5] rounded-2xl border border-[#E3E8E5] bg-white p-2 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)]">
            {[...chartData].reverse().map((item, idx) => {
              const bComp = item.biomarkerComparisons;
              const prevComp = item.previousSessionComparison;
              return (
                <div
                  key={item.date + idx}
                  className="flex flex-col gap-3 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F3F0] text-xs font-bold text-[#147D72]">
                        #{chartData.length - idx}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#173B38]">
                          {formatDate(item.date)}
                        </p>
                        <p className="text-[11px] text-[#6B7D79]">
                          Status: {formatStatus(item.status)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {item.speakingRate !== null && (
                        <span className="rounded-lg bg-[#F8F6F0] px-2.5 py-1 font-medium text-[#173B38]">
                          {item.speakingRate.toFixed(0)} WPM
                        </span>
                      )}
                      {item.pauseDensity !== null && (
                        <span className="rounded-lg bg-[#F8F6F0] px-2.5 py-1 font-medium text-[#173B38]">
                          Pause: {item.pauseDensity.toFixed(2)}
                        </span>
                      )}
                      {item.lexicalDiversity !== null && (
                        <span className="rounded-lg bg-[#F8F6F0] px-2.5 py-1 font-medium text-[#173B38]">
                          Diversity: {item.lexicalDiversity.toFixed(2)}
                        </span>
                      )}
                      {item.transcript?.language && (
                        <Badge variant="teal">
                          {item.transcript.language.toUpperCase()}
                          {typeof item.transcript.confidence === "number" && item.transcript.confidence > 0
                            ? ` (${(item.transcript.confidence * 100).toFixed(0)}%)`
                            : ""}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* COMPARISONS AGAINST PERSONAL BASELINE & PREVIOUS SESSION */}
                  {(bComp || prevComp) && (
                    <div className="rounded-xl border border-[#E3E8E5] bg-[#FAF9F5] p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#147D72]">
                        <span>Compared with Personal Baseline</span>
                        {prevComp?.session_label && (
                          <span className="text-[#6B7D79] normal-case font-medium">
                            {prevComp.session_label}
                            {prevComp.speaking_rate_diff !== null && prevComp.speaking_rate_diff !== undefined && (
                              ` (${prevComp.speaking_rate_diff > 0 ? "+" : ""}${prevComp.speaking_rate_diff} WPM)`
                            )}
                          </span>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        {bComp?.speaking_rate && (
                          <div className="rounded-lg bg-white border border-[#EBE8DF] p-2">
                            <span className="text-[11px] text-[#6B7D79]">Speaking Rate</span>
                            <p className="font-semibold text-[#173B38]">
                              {bComp.speaking_rate.current_value !== null ? `${bComp.speaking_rate.current_value.toFixed(0)} WPM` : "—"}
                              {bComp.speaking_rate.absolute_diff !== null && (
                                <span className={`ml-1 text-[11px] font-medium ${
                                  bComp.speaking_rate.trend_direction === "higher"
                                    ? "text-[#147D72]"
                                    : bComp.speaking_rate.trend_direction === "lower"
                                    ? "text-[#A86A43]"
                                    : "text-[#6B7D79]"
                                }`}>
                                  ({bComp.speaking_rate.absolute_diff > 0 ? "+" : ""}{bComp.speaking_rate.absolute_diff.toFixed(0)} WPM
                                  {bComp.speaking_rate.percentage_diff !== null ? `, ${bComp.speaking_rate.percentage_diff > 0 ? "+" : ""}${bComp.speaking_rate.percentage_diff}%` : ""})
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-[#6B7D79] mt-0.5">{bComp.speaking_rate.comparison_label}</p>
                          </div>
                        )}

                        {bComp?.pause_density && (
                          <div className="rounded-lg bg-white border border-[#EBE8DF] p-2">
                            <span className="text-[11px] text-[#6B7D79]">Pause Density</span>
                            <p className="font-semibold text-[#173B38]">
                              {bComp.pause_density.current_value !== null ? bComp.pause_density.current_value.toFixed(2) : "—"}
                              {bComp.pause_density.absolute_diff !== null && (
                                <span className={`ml-1 text-[11px] font-medium ${
                                  bComp.pause_density.trend_direction === "higher"
                                    ? "text-[#A86A43]"
                                    : bComp.pause_density.trend_direction === "lower"
                                    ? "text-[#147D72]"
                                    : "text-[#6B7D79]"
                                }`}>
                                  ({bComp.pause_density.absolute_diff > 0 ? "+" : ""}{bComp.pause_density.absolute_diff.toFixed(2)}
                                  {bComp.pause_density.percentage_diff !== null ? `, ${bComp.pause_density.percentage_diff > 0 ? "+" : ""}${bComp.pause_density.percentage_diff}%` : ""})
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-[#6B7D79] mt-0.5">{bComp.pause_density.comparison_label}</p>
                          </div>
                        )}

                        {bComp?.lexical_diversity && (
                          <div className="rounded-lg bg-white border border-[#EBE8DF] p-2">
                            <span className="text-[11px] text-[#6B7D79]">Lexical Diversity (TTR)</span>
                            <p className="font-semibold text-[#173B38]">
                              {bComp.lexical_diversity.current_value !== null ? bComp.lexical_diversity.current_value.toFixed(2) : "—"}
                              {bComp.lexical_diversity.absolute_diff !== null && (
                                <span className={`ml-1 text-[11px] font-medium ${
                                  bComp.lexical_diversity.trend_direction === "higher"
                                    ? "text-[#147D72]"
                                    : bComp.lexical_diversity.trend_direction === "lower"
                                    ? "text-[#A86A43]"
                                    : "text-[#6B7D79]"
                                }`}>
                                  ({bComp.lexical_diversity.absolute_diff > 0 ? "+" : ""}{bComp.lexical_diversity.absolute_diff.toFixed(2)}
                                  {bComp.lexical_diversity.percentage_diff !== null ? `, ${bComp.lexical_diversity.percentage_diff > 0 ? "+" : ""}${bComp.lexical_diversity.percentage_diff}%` : ""})
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-[#6B7D79] mt-0.5">{bComp.lexical_diversity.comparison_label}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}


                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CLINICAL REMINDER */}
      <footer className="rounded-2xl border border-[#E3E8E5] bg-[#F8F6F0] p-4 text-center">
        <p className="text-xs text-[#6B7D79]">
          <strong>Non-Diagnostic Observational Notice:</strong> Longitudinal speech monitoring reflects acoustic patterns relative to personal baseline and is not a clinical diagnosis.
        </p>
      </footer>
    </PageContainer>
  );
}