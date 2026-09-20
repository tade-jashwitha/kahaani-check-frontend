"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Mic,
  CalendarDays,
  TrendingUp,
  Clock,
  Globe,
  Phone,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Activity,
  FileText,
  Loader2,
  ClipboardCheck,
  StickyNote,
  Check,
  CalendarClock,
  Bell,
  Printer,
  Sparkles,
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
import StatCard from "@/app/components/ui/StatCard";
import SectionHeader from "@/app/components/ui/SectionHeader";
import Badge from "@/app/components/ui/Badge";
import Button from "@/app/components/ui/Button";
import Avatar from "@/app/components/ui/Avatar";
import { apiFetch } from "@/app/lib/api";

interface Elder {
  id: string;
  display_name: string;
  phone_e164: string;
  preferred_call_language: string;
  dob_year_range: string | null;
  timezone: string;
  status: string;
  created_at: string;
}

interface TrajectoryPoint {
  observation_number?: number;
  recorded_at?: string;
  overall_status?: string;
  features?: {
    speaking_rate_wpm?: number;
    pause_density?: number;
    lexical_diversity_ttr?: number;
    speech_duration_seconds?: number;
  };
  deviations?: {
    speaking_rate?: { z_score?: number; status?: string };
    pause_density?: { z_score?: number; status?: string };
    lexical_diversity?: { z_score?: number; status?: string };
  };
}

interface TrajectoryResponse {
  elder_id?: string;
  status?: string;
  observation_count?: number;
  baseline?: {
    speaking_rate_mean: number | null;
    pause_density_mean: number | null;
    lexical_diversity_mean: number | null;
    sample_count: number | null;
  } | null;
  baseline_progress?: {
    completed: number;
    required: number;
    ready: boolean;
  };
  caregiver_summary?: {
    overall_status?: string;
    speaking_rate_status?: string;
    pause_density_status?: string;
    lexical_diversity_status?: string;
    key_observations?: string[];
    longitudinal_direction?: string;
    disclaimer?: string;
  };
  observations?: TrajectoryPoint[];
}

interface CheckinItem {
  id: string;
  scheduled_for?: string;
  created_at?: string;
  status?: string;
  call_id?: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatLanguage(code: string): string {
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
  return map[code?.toLowerCase()] || code?.toUpperCase() || "Hindi";
}

export default function ElderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const elderId = String(params?.id ?? "");

  const [elder, setElder] = useState<Elder | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingCheckin, setStartingCheckin] = useState(false);
  const [error, setError] = useState("");

  // Inline notes state (persisted to localStorage per elder)
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    async function loadElderData() {
      if (!elderId) return;
      try {
        setLoading(true);
        setError("");

        const [elderRes, trajRes, checkinsRes] = await Promise.allSettled([
          apiFetch(`/v1/elders/${elderId}`),
          apiFetch(`/v1/elders/${elderId}/trajectory`),
          apiFetch(`/v1/check-ins/elder/${elderId}`),
        ]);

        if (elderRes.status === "fulfilled") {
          setElder(elderRes.value as Elder);
        } else {
          throw new Error("Unable to load elder profile.");
        }

        if (trajRes.status === "fulfilled") {
          setTrajectory(trajRes.value as TrajectoryResponse);
        }

        if (checkinsRes.status === "fulfilled" && Array.isArray(checkinsRes.value)) {
          setCheckins(checkinsRes.value as CheckinItem[]);
        }
      } catch (err) {
        console.error("Failed to load elder:", err);
        setError(err instanceof Error ? err.message : "Failed to load elder profile.");
      } finally {
        setLoading(false);
      }
    }

    loadElderData();
  }, [elderId]);

  // Load saved notes from localStorage
  useEffect(() => {
    if (!elderId) return;
    const saved = localStorage.getItem(`elder_notes_${elderId}`) ?? "";
    setNotes(saved);
  }, [elderId]);

  function handleSaveNotes() {
    localStorage.setItem(`elder_notes_${elderId}`, notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  const observations = useMemo(
    () => trajectory?.observations ?? [],
    [trajectory]
  );

  const completedCount = trajectory?.baseline_progress?.completed ?? Math.min(observations.length, 3);
  const isBaselineReady = trajectory?.baseline_progress?.ready || Boolean(trajectory?.baseline);
  const latestObservation = observations.length > 0 ? observations[observations.length - 1] : null;
  const latestFeatures = latestObservation?.features;

  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  const upcomingScheduled = useMemo(
    () => checkins.find((c) => c.status === "scheduled" || c.status === "initiated"),
    [checkins]
  );

  const stabilityInfo = useMemo(() => {
    if (!isBaselineReady || observations.length < 3) {
      return {
        title: "Speech Pattern: Calibrating Baseline",
        status: "calibrating",
        badge: "Calibrating",
        badgeColor: "bg-[#E8F3F0] text-[#147D72]",
        borderColor: "border-[#C8DFD9]",
        bgColor: "bg-[#F7FAF9]",
        description: `Building ${elder?.display_name || "elder"}'s individual acoustic baseline (${completedCount} of 3 sessions completed). Once calibrated, sessions are compared against this individual baseline.`,
        summary: `Speech patterns are currently calibrating. Kahaani-Check learns ${elder?.display_name || "this elder"}'s personal vocal rhythm across initial sessions before evaluating longitudinal stability.`,
      };
    }

    const trajStatus = trajectory?.status ?? "stable";
    const hasShift =
      trajStatus === "change_detected" ||
      trajStatus === "consecutive_deviations" ||
      observations.some((o) =>
        o.deviations && Object.values(o.deviations).some((d) => d?.status === "abnormal" || d?.status === "change_detected")
      );

    if (hasShift) {
      return {
        title: "Speech Pattern: Variation Noted",
        status: "variation_noted",
        badge: "Variation Noted",
        badgeColor: "bg-[#FEF3C7] text-[#92400E]",
        borderColor: "border-[#F59E0B]/40",
        bgColor: "bg-[#FFFDF7]",
        description: "Recent speech patterns differ from the person's established baseline. Consider reviewing the detailed report with a healthcare professional.",
        summary: "Speaking tempo and conversational rhythm show acoustic variation compared with their established personal baseline. A clinical summary is available to share with their doctor.",
      };
    }

    const hasMild = observations.some((o) =>
      o.deviations && Object.values(o.deviations).some((d) => d?.status === "mild_deviation")
    );
    if (hasMild) {
      return {
        title: "Speech Pattern: Some Variation",
        status: "some_variation",
        badge: "Some Variation",
        badgeColor: "bg-[#FEF3C7] text-[#92400E]",
        borderColor: "border-[#F59E0B]/40",
        bgColor: "bg-[#FFFDF7]",
        description: "Recent speech patterns show mild acoustic variation from baseline, remaining within general conversational fluctuation.",
        summary: "Speaking rhythm has experienced mild fluctuations but remains broadly aligned with their established personal baseline.",
      };
    }

    return {
      title: "Speech Pattern: Steady",
      status: "steady",
      badge: "Steady",
      badgeColor: "bg-[#E8F3F0] text-[#147D72]",
      borderColor: "border-[#22C55E]/30",
      bgColor: "bg-[#F9FCFA]",
      description: "Recent speech patterns are consistent with this person's established baseline.",
      summary: "Speaking rhythm and conversational flow have remained broadly consistent with the person's established baseline over the recent check-ins.",
    };
  }, [isBaselineReady, observations, completedCount, trajectory?.status, elder?.display_name]);

  const trendGraphData = useMemo(() => {
    if (observations.length === 0) return [];
    return observations.map((obs, idx) => {
      const dateStr = obs.recorded_at
        ? new Date(obs.recorded_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
        : `Session ${idx + 1}`;

      let stabilityScore = 0; // 0 = centered on personal baseline
      let label = "Consistent with baseline";

      if (trajectory?.baseline?.speaking_rate_mean && obs.features?.speaking_rate_wpm) {
        const base = trajectory.baseline.speaking_rate_mean;
        const diff = ((obs.features.speaking_rate_wpm - base) / base) * 100;
        stabilityScore = Math.round(diff);
        if (Math.abs(diff) > 20) {
          label = "Notable variation";
        } else if (Math.abs(diff) > 10) {
          label = "Small variation";
        } else {
          label = "Consistent with baseline";
        }
      }

      return {
        session: dateStr,
        stabilityScore: isBaselineReady ? stabilityScore : 0,
        statusLabel: isBaselineReady ? label : "Calibrating",
        isVariant: Math.abs(stabilityScore) > 20,
      };
    });
  }, [observations, trajectory?.baseline, isBaselineReady]);

  async function handleScheduleNextCheckin() {
    try {
      setScheduling(true);
      const res = (await apiFetch(`/v1/schedules/${elderId}/next-check-in`, {
        method: "POST",
      })) as {
        created?: boolean;
        scheduled_local?: string;
        check_in?: CheckinItem;
      };

      const scheduledTime = res?.scheduled_local
        ? new Date(res.scheduled_local).toLocaleString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "upcoming slot";

      setScheduleSuccess(`Voice session scheduled for ${scheduledTime}! Alert notification dispatched.`);
      setTimeout(() => setScheduleSuccess(null), 7000);

      // Refresh check-ins list
      const updatedCheckins = await apiFetch(`/v1/check-ins/elder/${elderId}`);
      if (Array.isArray(updatedCheckins)) {
        setCheckins(updatedCheckins as CheckinItem[]);
      }

      // Notify alerts listeners across app (including Sidebar badge)
      window.dispatchEvent(new Event("alerts-updated"));
    } catch (err) {
      console.error("Failed to schedule check-in:", err);
      setError(err instanceof Error ? err.message : "Failed to schedule session.");
    } finally {
      setScheduling(false);
    }
  }

  async function handleStartCheckin() {
    try {
      setStartingCheckin(true);
      const res = (await apiFetch(`/v1/check-ins/elder/${elderId}/start`, {
        method: "POST",
      })) as { check_in?: { id?: string } };

      const checkInId = res?.check_in?.id;
      if (checkInId) {
        router.push(`/dashboard/elders/${elderId}/checkins/${checkInId}`);
      } else {
        router.push(`/dashboard/elders/${elderId}/checkins`);
      }
    } catch (err) {
      console.error("Failed to start checkin:", err);
      router.push(`/dashboard/elders/${elderId}/checkins`);
    } finally {
      setStartingCheckin(false);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#147D72]" />
        </div>
      </PageContainer>
    );
  }

  if (error || !elder) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-[#E3E8E5] bg-white p-8 text-center">
          <AlertCircle size={32} className="mx-auto text-[#A86A43]" />
          <h2 className="mt-4 text-lg font-semibold text-[#173B38]">
            Elder not found
          </h2>
          <p className="mt-1 text-xs text-[#6B7D79]">
            {error || "The requested elder profile could not be loaded."}
          </p>
          <Link href="/dashboard/elders" className="mt-5 inline-block">
            <Button variant="primary">Return to Elders</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* PAGE HEADER */}
      <PageHeader
        title={elder.display_name}
        subtitle="Individualized speech tracking and longitudinal observations"
        backHref="/dashboard/elders"
        backLabel="All elders"
        badge={
          <Badge variant="teal" icon={<ShieldCheck size={12} />}>
            Voice Consent Active
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={`/dashboard/elders/${elderId}/report`}>
              <Button
                variant="outline"
                icon={<FileText size={15} />}
              >
                Export Doctor Report
              </Button>
            </Link>
            <Button
              variant="outline"
              icon={<CalendarClock size={16} />}
              loading={scheduling}
              onClick={handleScheduleNextCheckin}
            >
              Schedule Check-in
            </Button>
            <Button
              variant="primary"
              icon={<Mic size={16} />}
              loading={startingCheckin}
              onClick={handleStartCheckin}
            >
              {observations.length === 0 ? "Start First Check-in" : "New Voice Check-in"}
            </Button>
          </div>
        }
      />

      {/* SCHEDULE SUCCESS TOAST BANNER */}
      {scheduleSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#22C55E]/40 bg-[#F0FDF4] p-4 text-[#15803D] animate-in fade-in">
          <Check size={18} className="flex-shrink-0" />
          <p className="text-xs font-semibold">{scheduleSuccess}</p>
        </div>
      )}

      {/* UPCOMING SCHEDULED SESSION ALERT BANNER */}
      {upcomingScheduled && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[#F59E0B]/40 bg-[#FFFBEB] p-4 text-[#92400E]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
              <Bell size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#92400E]">
                  Scheduled Session
                </span>
                <span className="text-xs font-semibold text-[#173B38]">
                  {formatDate(upcomingScheduled.scheduled_for || upcomingScheduled.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#6B7D79]">
                Session alert active for {elder.display_name}. Caregiver notification dispatched to dashboard.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link href="/dashboard/alerts">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl border border-[#E3E8E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#173B38] hover:bg-[#F8F6F0] transition"
              >
                <Bell size={13} />
                View Alert
              </button>
            </Link>
            <Link href={`/dashboard/elders/${elderId}/checkins/${upcomingScheduled.id}`}>
              <Button variant="primary" size="sm" icon={<Mic size={13} />}>
                Start Session
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ELDER METADATA HERO CARD */}
      <section className="mb-6 rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar with status dot */}
            <div className="relative">
              <Avatar name={elder.display_name} size="lg" />
              <span
                className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                  elder.status === "active" ? "bg-[#22C55E]" : "bg-[#F59E0B]"
                }`}
                title={elder.status === "active" ? "Active" : "Inactive"}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#173B38]">
                {elder.display_name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6B7D79]">
                <span className="inline-flex items-center gap-1">
                  <Phone size={13} className="text-[#8F9E9B]" />
                  {elder.phone_e164}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Globe size={13} className="text-[#8F9E9B]" />
                  {formatLanguage(elder.preferred_call_language)}
                </span>
                {elder.dob_year_range && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} className="text-[#8F9E9B]" />
                      Born in {elder.dob_year_range}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/dashboard/elders/${elderId}/trends`}>
              <Button variant="outline" size="md" icon={<TrendingUp size={15} />}>
                View Trends
              </Button>
            </Link>
            <Link href={`/dashboard/elders/${elderId}/checkins`}>
              <Button variant="secondary" size="md" icon={<ClipboardCheck size={15} />}>
                Check-ins ({checkins.length})
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* BASELINE CALIBRATION PROGRESS CARD */}
      <section className="mb-6 rounded-2xl border border-[#C8DFD9] bg-[#E8F3F0] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#147D72]">
              Personal Baseline Calibration
            </span>
            <h3 className="mt-1 text-base font-semibold text-[#173B38]">
              {isBaselineReady
                ? "Personal Baseline Established"
                : `Building Baseline (${completedCount} of 3 Check-ins Completed)`}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#6B7D79]">
              {isBaselineReady
                ? "Longitudinal comparison is active. Check-ins are compared against this elder's personalized baseline."
                : "Kahaani-Check needs 3 completed check-ins to calibrate this elder's individual speaking habits before calculating deviation trends."}
            </p>
          </div>

          {/* STEPPER BADGES */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => {
              const isDone = completedCount >= step;
              return (
                <div
                  key={step}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition ${
                    isDone
                      ? "bg-[#147D72] text-white shadow-sm"
                      : "border border-[#C8DFD9] bg-white/70 text-[#8F9E9B]"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={15} /> : step}
                </div>
              );
            })}
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#C8DFD9]">
          <div
            className="h-full rounded-full bg-[#147D72] transition-all duration-500"
            style={{ width: `${Math.min((completedCount / 3) * 100, 100)}%` }}
          />
        </div>
      </section>

      {/* 1. SPEECH PATTERN STABILITY & CAREGIVER SUMMARY */}
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        {/* SPEECH PATTERN STABILITY CARD */}
        <div className={`rounded-2xl border p-6 ${stabilityInfo.borderColor} ${stabilityInfo.bgColor} shadow-[0_1px_3px_0_rgba(23,59,56,0.04)]`}>
          <div className="flex items-center justify-between">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${stabilityInfo.badgeColor}`}>
              {stabilityInfo.badge}
            </span>
            <span className="text-xs text-[#8F9E9B]">
              {latestObservation?.recorded_at ? formatDate(latestObservation.recorded_at) : "Awaiting data"}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-[#173B38]">
            {stabilityInfo.title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-[#52615D]">
            {stabilityInfo.description}
          </p>
        </div>

        {/* CAREGIVER SUMMARY CARD */}
        <div className="rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#147D72]">
              <Sparkles size={14} />
              Caregiver Summary
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#52615D]">
              {stabilityInfo.summary}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F0EFEA] flex items-center justify-between">
            <span className="text-[11px] text-[#8F9E9B]">
              Longitudinal tracking active
            </span>
            <Link
              href={`/dashboard/elders/${elderId}/report`}
              className="text-xs font-semibold text-[#147D72] hover:underline flex items-center gap-1"
            >
              <FileText size={13} />
              Doctor Summary
            </Link>
          </div>
        </div>
      </section>

      {/* 2. PERSONAL BASELINE TREND GRAPH */}
      {observations.length > 0 && (
        <section className="mb-8 rounded-2xl border border-[#E3E8E5] bg-white p-6 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <SectionHeader
              title="Personal Baseline Trend Graph"
              subtitle="Longitudinal stability relative to their established voice pattern"
            />
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#147D72]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#147D72]" />
                Personal Baseline Zone
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-[#A86A43]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#A86A43]" />
                Session Observation
              </span>
            </div>
          </div>

          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendGraphData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" vertical={false} />
                <XAxis dataKey="session" stroke="#8F9E9B" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8F9E9B"
                  fontSize={10}
                  domain={[-35, 35]}
                  ticks={[-25, 0, 25]}
                  tickFormatter={(val) => (val === 0 ? "Baseline" : `${val > 0 ? "+" : ""}${val}%`)}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-[#E3E8E5] bg-white p-3 shadow-md text-xs">
                        <p className="font-semibold text-[#173B38]">{data.session}</p>
                        <p className="mt-1 text-[#6B7D79]">
                          Status: <strong className={data.isVariant ? "text-[#A86A43]" : "text-[#147D72]"}>{data.statusLabel}</strong>
                        </p>
                        <p className="text-[10px] text-[#8F9E9B] mt-0.5">
                          Compared against personal baseline
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="#147D72" strokeWidth={2} strokeDasharray="4 4" label={{ value: "Personal Baseline", fill: "#147D72", fontSize: 10, position: "insideTopRight" }} />
                <ReferenceLine y={20} stroke="#E3E8E5" strokeDasharray="2 2" />
                <ReferenceLine y={-20} stroke="#E3E8E5" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="stabilityScore"
                  name="Stability"
                  stroke="#A86A43"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: "#A86A43" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E8E5] pt-3 text-xs text-[#6B7D79]">
            <p>
              Shows whether recent check-in sessions are consistent with {elder.display_name}&apos;s established baseline.
            </p>
            <Link
              href={`/dashboard/elders/${elderId}/report`}
              className="font-medium text-[#147D72] hover:underline"
            >
              Export detailed clinical report →
            </Link>
          </div>
        </section>
      )}

      {/* 3. DOCTOR REPORT ACTION BANNER */}
      <section className="mb-8 rounded-2xl border border-[#E3E8E5] bg-white p-5 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#E8F3F0] text-[#147D72]">
              <FileText size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#173B38]">
                Doctor Consultation Report
              </h4>
              <p className="text-xs text-[#6B7D79] mt-0.5">
                Generate a structured, printable A4 clinical summary with acoustic biomarker tables and personal baseline deviations for physician review.
              </p>
            </div>
          </div>
          <Link href={`/dashboard/elders/${elderId}/report`} className="w-full sm:w-auto">
            <Button variant="primary" size="md" icon={<Printer size={15} />} className="w-full sm:w-auto whitespace-nowrap">
              Export Doctor Report
            </Button>
          </Link>
        </div>
      </section>

      {/* RECENT CHECK-INS SECTION */}
      <section className="mb-8">
        <SectionHeader
          title="Recent Check-ins"
          subtitle="Audio recordings and longitudinal observations"
          actionHref={`/dashboard/elders/${elderId}/checkins`}
          actionLabel="View all check-ins"
          className="mb-4"
        />

        {checkins.length === 0 ? (
          <div className="rounded-2xl border border-[#E3E8E5] bg-white p-8 text-center">
            <CalendarDays size={24} className="mx-auto text-[#8F9E9B]" />
            <p className="mt-3 text-sm font-semibold text-[#173B38]">
              No check-ins recorded yet
            </p>
            <p className="mt-1 text-xs text-[#6B7D79]">
              Click &ldquo;Start First Check-in&rdquo; to record or upload the elder&apos;s speech.
            </p>
            <div className="mt-4">
              <Button
                variant="primary"
                size="sm"
                icon={<Mic size={14} />}
                onClick={handleStartCheckin}
              >
                Start Check-in
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {checkins.slice(0, 4).map((ci, index) => {
              const isCompleted = ci.status === "completed";
              const isFirst = index === 0;
              const hasRecentVariation = stabilityInfo.status === "variation_noted";
              
              const patternStatus = !isCompleted
                ? "Scheduled"
                : !isBaselineReady
                ? "Calibrating"
                : isFirst && hasRecentVariation
                ? "Variation Noted"
                : "Steady";

              const observationText = !isCompleted
                ? "Upcoming voice check-in session scheduled."
                : !isBaselineReady
                ? "Voice session recorded for personal baseline calibration."
                : patternStatus === "Variation Noted"
                ? "Acoustic variation noted compared with personal baseline."
                : "Speech rhythm was consistent with the established baseline.";

              const statusBadgeClass =
                patternStatus === "Steady"
                  ? "bg-[#E8F3F0] text-[#147D72]"
                  : patternStatus === "Variation Noted"
                  ? "bg-[#FEF3C7] text-[#92400E]"
                  : patternStatus === "Calibrating"
                  ? "bg-[#F3F4F6] text-[#4B5563]"
                  : "bg-[#FEF3C7] text-[#92400E]";

              return (
                <div
                  key={ci.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E3E8E5] bg-white p-4 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)]"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        isCompleted ? "bg-[#E8F3F0] text-[#147D72]" : "bg-[#FEF3C7] text-[#D97706]"
                      }`}
                    >
                      #{checkins.length - index}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-[#173B38]">
                          {formatDate(ci.scheduled_for || ci.created_at)}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass}`}>
                          {patternStatus}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#6B7D79]">
                        {observationText}
                      </p>
                    </div>
                  </div>

                  <Link href={`/dashboard/elders/${elderId}/checkins/${ci.id}`} className="self-end sm:self-auto">
                    <Button variant="outline" size="sm" icon={<FileText size={13} />}>
                      View
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CAREGIVER NOTES */}
      <section className="mb-8 rounded-2xl border border-[#E3E8E5] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <SectionHeader
            title="Caregiver Notes"
            subtitle="Private notes visible only to you — auto-saved per elder."
          />
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={notesSaved}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              notesSaved
                ? "bg-[#E8F3F0] text-[#147D72]"
                : "border border-[#E3E8E5] text-[#6B7D79] hover:bg-[#F8F6F0]"
            }`}
          >
            {notesSaved ? <Check size={12} /> : <StickyNote size={12} />}
            {notesSaved ? "Saved" : "Save"}
          </button>
        </div>

        <textarea
          id="elder-notes"
          rows={4}
          placeholder="Add observations, mood notes, doctor visit reminders…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesSaved(false);
          }}
          className="w-full resize-y rounded-xl border border-[#E3E8E5] bg-[#F8F6F0] p-3.5 text-xs leading-relaxed text-[#173B38] placeholder-[#8F9E9B] focus:border-[#147D72] focus:outline-none focus:ring-1 focus:ring-[#147D72]"
        />
      </section>

      {/* CLINICAL REMINDER FOOTER */}
      <footer className="rounded-2xl border border-[#E3E8E5] bg-[#F8F6F0] p-4 text-center">
        <p className="text-xs text-[#6B7D79]">
          <strong>Clinical Reminder:</strong> Kahaani-Check is an observational speech tracking platform designed to support early conversations with doctors. It does not provide medical diagnoses.
        </p>
      </footer>
    </PageContainer>
  );
}