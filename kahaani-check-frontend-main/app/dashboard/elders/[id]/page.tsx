"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  Activity,
  CalendarDays,
  Home,
  Users,
  ClipboardCheck,
  Lightbulb,
  Settings,
  TrendingUp,
  AlertCircle,
  Loader2,
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

import Avatar from "@/app/components/ui/Avatar";
import { apiFetch } from "@/app/lib/api";

interface Baseline {
  speaking_rate_mean: number | null;
  pause_density_mean: number | null;
  lexical_diversity_mean: number | null;
  sample_count: number | null;
}

interface TrajectoryObservation {
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
    speaking_rate?: {
      z_score?: number;
      status?: string;
    };

    pause_density?: {
      z_score?: number;
      status?: string;
    };

    lexical_diversity?: {
      z_score?: number;
      status?: string;
    };
  };
}

interface TrajectoryResponse {
  elder_id?: string;
  status?: string;
  observation_count?: number;
  baseline?: Baseline | null;
  observations?: TrajectoryObservation[];
}

interface ChartPoint {
  date: string;
  speakingRate: number | null;
  pauseDensity: number | null;
  wordDiversity: number | null;
}

function formatStatus(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Insufficient evidence";
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("stable")) {
    return "Stable compared with baseline";
  }

  if (
    normalized.includes("change") ||
    normalized.includes("review")
  ) {
    return "Change worth reviewing";
  }

  if (normalized.includes("insufficient")) {
    return "Insufficient evidence";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function getZScore(
  observation: TrajectoryObservation,
  metric:
    | "speaking_rate"
    | "pause_density"
    | "lexical_diversity"
): number | null {
  const value =
    observation.deviations?.[metric]?.z_score;

  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function buildChartData(
  observations: TrajectoryObservation[]
): ChartPoint[] {
  return observations
    .filter(
      (observation) =>
        typeof observation.recorded_at === "string"
    )
    .map((observation) => ({
      date: observation.recorded_at as string,

      speakingRate: getZScore(
        observation,
        "speaking_rate"
      ),

      pauseDensity: getZScore(
        observation,
        "pause_density"
      ),

      wordDiversity: getZScore(
        observation,
        "lexical_diversity"
      ),
    }))
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    );
}

export default function TrendsPage() {
  const params = useParams();

  const elderId = String(params?.id ?? "");

  const [trajectory, setTrajectory] =
    useState<TrajectoryResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrajectory() {
      if (!elderId) {
        setError("Elder ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await apiFetch(
          `/v1/elders/${elderId}/trajectory`
        );

        setTrajectory(
          response as TrajectoryResponse
        );
      } catch (err) {
        console.error(
          "Failed to load trajectory:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the trajectory."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTrajectory();
  }, [elderId]);

  const observations = useMemo(
    () => trajectory?.observations ?? [],
    [trajectory]
  );

  const baseline =
    trajectory?.baseline ?? null;

  const overallStatus = formatStatus(
    trajectory?.status
  );

  const observationCount =
    typeof trajectory?.observation_count === "number"
      ? trajectory.observation_count
      : observations.length;

  const latestObservation =
    observations.length > 0
      ? observations[observations.length - 1]
      : null;

  const latestFeatures =
    latestObservation?.features ?? {};

  const chartData = useMemo(
    () => buildChartData(observations),
    [observations]
  );

  return (
    <main className="min-h-screen bg-[#FBF7EE] text-[#263331]">

      {/* DESKTOP SIDEBAR */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-[#E7E3D9] bg-[#FFFDF8] lg:block">

        <div className="flex items-center gap-3 px-7 py-7">

          <div className="relative h-9 w-9">
            <span className="absolute left-1 top-2 h-5 w-3 rotate-[-35deg] rounded-full bg-[#176B5F]" />
            <span className="absolute left-4 top-1 h-5 w-3 rotate-[35deg] rounded-full bg-[#176B5F]" />
            <span className="absolute left-2 top-5 h-4 w-3 rotate-[-20deg] rounded-full bg-[#E99B68]" />
          </div>

          <div>
            <p className="font-semibold text-[#24584F]">
              Kahaani-Check
            </p>

            <p className="text-[10px] text-[#87918D]">
              Because every story matters
            </p>
          </div>

        </div>

        <nav className="space-y-1 px-4">

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <Home size={18} />
            Home
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <Users size={18} />
            Elders
          </Link>

          <Link
            href={`/dashboard/elders/${elderId}/checkins`}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <ClipboardCheck size={18} />
            Check-ins
          </Link>

          <Link
            href={`/dashboard/elders/${elderId}/trends`}
            className="flex items-center gap-3 rounded-xl bg-[#EAF2EE] px-4 py-3 text-sm font-semibold text-[#176B5F]"
          >
            <Lightbulb size={18} />
            Insights
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <Settings size={18} />
            Settings
          </Link>

        </nav>
      </aside>

      {/* MAIN */}

      <div className="lg:pl-64">

        <div className="mx-auto max-w-6xl px-5 py-6 pb-32 sm:px-8 lg:px-12 lg:py-10 lg:pb-12">

          {/* BACK */}

          <Link
            href={`/dashboard/elders/${elderId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#687470] transition hover:text-[#176B5F]"
          >
            <ArrowLeft size={17} />
            Back to elder profile
          </Link>

          {/* HEADER */}

          <section className="mt-7">

            <div className="flex items-start gap-4">

              <Avatar
                name="Elder"
                size="lg"
              />

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#176B5F]">
                  Trends & Insights
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Conversation patterns
                </h1>

                <p className="mt-1 text-sm text-[#7A8582]">
                  Understanding changes over time
                </p>

              </div>

            </div>

          </section>

          {/* ERROR */}

          {error && (
            <section className="mt-7 rounded-3xl border border-[#E8DDD4] bg-white p-6">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F8E7D8] text-[#A86A43]">
                  <AlertCircle size={22} />
                </div>

                <div>

                  <h2 className="text-base font-semibold">
                    We couldn&apos;t load the trends
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#7A8582]">
                    {error}
                  </p>

                </div>

              </div>

            </section>
          )}

          {/* CURRENT TRAJECTORY */}

          <section className="relative mt-7 overflow-hidden rounded-3xl border border-[#DCE8E2] bg-[#EEF4F2] p-6 sm:p-8">

            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/60 blur-3xl" />

            <div className="relative">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#176B5F] shadow-sm">

                {loading ? (
                  <Loader2
                    size={25}
                    className="animate-spin"
                  />
                ) : (
                  <TrendingUp size={25} />
                )}

              </div>

              <p className="mt-6 text-xs font-medium text-[#8A9290]">
                Current trajectory
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                {loading
                  ? "Loading trajectory..."
                  : error
                    ? "Unable to load"
                    : overallStatus}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687470]">
                {loading
                  ? "Retrieving processed conversation data."
                  : "Speech measures are compared with the elder's personal baseline."}
              </p>

            </div>

          </section>

          {/* SUMMARY */}

          <div className="mt-5 grid gap-4 sm:grid-cols-3">

            {/* STATUS */}

            <section className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#176B5F]">
                  <Activity size={19} />
                </div>

                <div>

                  <p className="text-xs text-[#8A9290]">
                    Overall pattern
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#315C55]">
                    {loading
                      ? "Loading..."
                      : overallStatus}
                  </p>

                </div>

              </div>

            </section>

            {/* CHECK-INS */}

            <section className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8E7D8] text-[#A86A43]">
                  <CalendarDays size={19} />
                </div>

                <div>

                  <p className="text-xs text-[#8A9290]">
                    Check-ins reviewed
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {loading
                      ? "Loading..."
                      : observationCount}
                  </p>

                </div>

              </div>

            </section>

            {/* LATEST */}

            <section className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4F2] text-[#176B5F]">
                  <TrendingUp size={19} />
                </div>

                <div>

                  <p className="text-xs text-[#8A9290]">
                    Latest check-in
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#315C55]">
                    {latestObservation?.recorded_at
                      ? formatDate(
                          latestObservation.recorded_at
                        )
                      : "Awaiting data"}
                  </p>

                </div>

              </div>

            </section>

          </div>

          {/* COMBINED TREND */}

          <section className="mt-7 rounded-3xl border border-[#E7E3D9] bg-[#FFFDF8] p-5 sm:p-7">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#176B5F]">
                Conversation patterns
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Personal trend
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7A8582]">
                Measures are shown relative to the elder&apos;s
                personal baseline. The baseline is represented
                by zero.
              </p>

            </div>

            {loading ? (

              <div className="mt-6 flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-[#DCDDD9] bg-[#FBFAF7]">

                <div className="text-center">

                  <Loader2
                    size={26}
                    className="mx-auto animate-spin text-[#176B5F]"
                  />

                  <p className="mt-4 text-sm font-semibold">
                    Loading trajectory
                  </p>

                  <p className="mt-1 text-xs text-[#8A9290]">
                    Retrieving processed check-ins...
                  </p>

                </div>

              </div>

            ) : chartData.length > 0 ? (

              <>

                <div className="mt-6 h-[360px] w-full">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <LineChart
                      data={chartData}
                      margin={{
                        top: 15,
                        right: 15,
                        left: -10,
                        bottom: 10,
                      }}
                    >

                      <CartesianGrid
                        stroke="#E8E6DF"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{
                          fontSize: 10,
                          fill: "#8A9290",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{
                          fontSize: 10,
                          fill: "#8A9290",
                        }}
                        axisLine={false}
                        tickLine={false}
                        domain={["auto", "auto"]}
                      />

                      <Tooltip
                        labelFormatter={(date) =>
                          formatDate(String(date))
                        }
                        formatter={(value, name) => {
                          const numericValue =
                            typeof value === "number"
                              ? value
                              : Number(value);

                          return [
                            Number.isFinite(numericValue)
                              ? numericValue.toFixed(2)
                              : "—",
                            String(name),
                          ];
                        }}
                        contentStyle={{
                          borderRadius: 12,
                          border:
                            "1px solid #E5E3DE",
                          background:
                            "#FFFDF8",
                          fontSize: 12,
                        }}
                      />

                      {/* PERSONAL BASELINE */}

                      <ReferenceLine
                        y={0}
                        stroke="#8FB3A8"
                        strokeDasharray="5 5"
                        strokeWidth={1.5}
                      />

                      {/* SPEAKING RATE */}

                      <Line
                        type="monotone"
                        dataKey="speakingRate"
                        name="Speaking rate"
                        stroke="#176B5F"
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                          fill: "#176B5F",
                        }}
                        activeDot={{
                          r: 6,
                        }}
                        connectNulls
                      />

                      {/* PAUSE DENSITY */}

                      <Line
                        type="monotone"
                        dataKey="pauseDensity"
                        name="Pause density"
                        stroke="#6F9F92"
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                          fill: "#6F9F92",
                        }}
                        activeDot={{
                          r: 6,
                        }}
                        connectNulls
                      />

                      {/* WORD DIVERSITY */}

                      <Line
                        type="monotone"
                        dataKey="wordDiversity"
                        name="Word diversity"
                        stroke="#D78D5D"
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                          fill: "#D78D5D",
                        }}
                        activeDot={{
                          r: 6,
                        }}
                        connectNulls
                      />

                    </LineChart>

                  </ResponsiveContainer>

                </div>

                {/* LEGEND */}

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">

                  <div className="flex items-center gap-2 text-xs text-[#687470]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#176B5F]" />
                    Speaking rate
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#687470]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#6F9F92]" />
                    Pause density
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#687470]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#D78D5D]" />
                    Word diversity
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#8A9290]">
                    <span className="h-0.5 w-5 bg-[#8FB3A8]" />
                    Personal baseline
                  </div>

                </div>

              </>

            ) : (

              <div className="mt-6 flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[#DCDDD9] bg-[#FBFAF7] px-6">

                <div className="max-w-md text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4F2] text-[#176B5F]">
                    <TrendingUp size={21} />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold">
                    Not enough usable trend data yet
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-[#8A9290]">
                    More processed check-ins are needed before
                    a longitudinal trend can be shown.
                  </p>

                </div>

              </div>

            )}

          </section>

          {/* CURRENT MEASUREMENTS */}

          <section className="mt-7">

            <div className="mb-5">

              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#176B5F]">
                Latest check-in
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Current observations
              </h2>

            </div>

            <div className="grid gap-4 sm:grid-cols-3">

              {/* SPEAKING RATE */}

              <div className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">

                <p className="text-xs text-[#8A9290]">
                  Speaking rate
                </p>

                <p className="mt-2 text-xl font-semibold text-[#176B5F]">
                  {typeof latestFeatures.speaking_rate_wpm ===
                  "number"
                    ? `${latestFeatures.speaking_rate_wpm.toFixed(1)} WPM`
                    : "Not available"}
                </p>

                <p className="mt-2 text-[11px] text-[#8A9290]">
                  Personal baseline:{" "}
                  {typeof baseline?.speaking_rate_mean ===
                  "number"
                    ? `${baseline.speaking_rate_mean.toFixed(1)} WPM`
                    : "Not available"}
                </p>

              </div>

              {/* PAUSE DENSITY */}

              <div className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">

                <p className="text-xs text-[#8A9290]">
                  Pause density
                </p>

                <p className="mt-2 text-xl font-semibold text-[#315C55]">
                  {typeof latestFeatures.pause_density ===
                  "number"
                    ? latestFeatures.pause_density.toFixed(3)
                    : "Not available"}
                </p>

                <p className="mt-2 text-[11px] text-[#8A9290]">
                  Personal baseline:{" "}
                  {typeof baseline?.pause_density_mean ===
                  "number"
                    ? baseline.pause_density_mean.toFixed(3)
                    : "Not available"}
                </p>

              </div>

              {/* WORD DIVERSITY */}

              <div className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">

                <p className="text-xs text-[#8A9290]">
                  Word diversity
                </p>

                <p className="mt-2 text-xl font-semibold text-[#A86A43]">
                  {typeof latestFeatures.lexical_diversity_ttr ===
                  "number"
                    ? latestFeatures.lexical_diversity_ttr.toFixed(3)
                    : "Not available"}
                </p>

                <p className="mt-2 text-[11px] text-[#8A9290]">
                  Personal baseline:{" "}
                  {typeof baseline?.lexical_diversity_mean ===
                  "number"
                    ? baseline.lexical_diversity_mean.toFixed(3)
                    : "Not available"}
                </p>

              </div>

            </div>

          </section>

          {/* BASELINE INFO */}

          <section className="mt-7 rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">

            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="text-xs text-[#8A9290]">
                  Personal baseline
                </p>

                <p className="mt-1 text-sm font-semibold text-[#315C55]">
                  {typeof baseline?.sample_count === "number"
                    ? `${baseline.sample_count} baseline samples`
                    : "Not available"}
                </p>

              </div>

              <Activity
                size={22}
                className="text-[#176B5F]"
              />

            </div>

          </section>

          {/* SAFETY NOTE */}

          <section className="mt-7 rounded-2xl border border-[#DCE8E2] bg-[#EEF4F2] p-5">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#176B5F]">
                <HeartIcon />
              </div>

              <div>

                <h2 className="text-sm font-semibold text-[#24584F]">
                  Important
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#687470]">
                  Kahaani-Check is not a diagnostic tool.
                  Changes in speech should be discussed with
                  a qualified healthcare professional when
                  appropriate.
                </p>

              </div>

            </div>

          </section>

        </div>

      </div>

      {/* MOBILE NAVIGATION */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E1D8] bg-[#FFFDF8]/95 px-2 py-2 backdrop-blur lg:hidden">

        <div className="mx-auto grid h-[68px] max-w-[480px] grid-cols-4">

          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center gap-1 text-[10px] text-[#87918D]"
          >
            <Home size={18} />
            Home
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex flex-col items-center justify-center gap-1 text-[10px] text-[#87918D]"
          >
            <Users size={18} />
            Elders
          </Link>

          <Link
            href={`/dashboard/elders/${elderId}/checkins`}
            className="flex flex-col items-center justify-center gap-1 text-[10px] text-[#87918D]"
          >
            <CalendarDays size={18} />
            Check-ins
          </Link>

          <Link
            href={`/dashboard/elders/${elderId}/trends`}
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-[#176B5F]"
          >
            <Lightbulb size={18} />
            Insights
          </Link>

        </div>

      </nav>

    </main>
  );
}

function HeartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}