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
  Heart,
  TrendingUp,
  Clock3,
  MessageCircle,
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

interface TrajectoryPoint {
  date: string;
  speakingRate: number | null;
  pauseDensity: number | null;
  lexicalDiversity: number | null;
  status: string;
}

interface Baseline {
  speaking_rate_mean: number | null;
  pause_density_mean: number | null;
  lexical_diversity_mean: number | null;
  sample_count: number | null;
}

interface TrajectoryResponse {
  elder_id?: string;
  status?: string;
  observation_count?: number;
  baseline?: Baseline | null;
  observations?: unknown[];
  [key: string]: unknown;
}

interface MetricChartProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  valueLabel: string;
  value: number | null;
  baseline: number | null;
  data: Array<{
    date: string;
    value: number | null;
  }>;
  formatter: (value: number) => string;
  iconBg: string;
  iconColor: string;
  lineColor: string;
  baselineColor: string;
}

function formatStatus(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
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
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  ).format(date);
}

function normalizeTrajectory(
  response: unknown
): TrajectoryPoint[] {
  if (
    !response ||
    typeof response !== "object"
  ) {
    return [];
  }

  const object =
    response as Record<string, unknown>;

  const observations =
    Array.isArray(object.observations)
      ? object.observations
      : [];

  return observations
    .map((observation) => {
      if (
        !observation ||
        typeof observation !== "object"
      ) {
        return null;
      }

      const item =
        observation as Record<string, unknown>;

      const features =
        item.features &&
        typeof item.features === "object"
          ? (item.features as Record<
              string,
              unknown
            >)
          : {};

      const recordedAt =
        typeof item.recorded_at === "string"
          ? item.recorded_at
          : null;

      if (!recordedAt) {
        return null;
      }

      const speakingRate =
        typeof features.speaking_rate_wpm ===
        "number"
          ? features.speaking_rate_wpm
          : null;

      const pauseDensity =
        typeof features.pause_density ===
        "number"
          ? features.pause_density
          : null;

      const lexicalDiversity =
        typeof features.lexical_diversity_ttr ===
        "number"
          ? features.lexical_diversity_ttr
          : null;

      const status =
        typeof item.overall_status === "string"
          ? item.overall_status
          : "Insufficient data";

      return {
        date: recordedAt,
        speakingRate,
        pauseDensity,
        lexicalDiversity,
        status,
      };
    })
    .filter(
      (
        item
      ): item is TrajectoryPoint =>
        item !== null
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    );
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
  iconBg,
  iconColor,
  lineColor,
  baselineColor,
}: MetricChartProps) {
  return (
    <section className="rounded-3xl border border-[#E7E3D9] bg-[#FFFDF8] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
          >
            {icon}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#263331]">
              {title}
            </h3>

            <p className="mt-1 max-w-xs text-xs leading-5 text-[#7A8582]">
              {description}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#8A9290]">
            Latest
          </p>

          <p className="mt-1 text-lg font-semibold text-[#315C55]">
            {value !== null
              ? formatter(value)
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#EEECE7] bg-[#FBFAF7] p-3">
        {data.length > 0 ? (
          <div className="h-[220px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={data}
                margin={{
                  top: 12,
                  right: 12,
                  left: -18,
                  bottom: 5,
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
                  formatter={(tooltipValue) => {
                    const numericValue =
                      typeof tooltipValue ===
                      "number"
                        ? tooltipValue
                        : Number(
                            tooltipValue
                          );

                    return [
                      Number.isFinite(
                        numericValue
                      )
                        ? formatter(
                            numericValue
                          )
                        : "—",
                      valueLabel,
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

                {baseline !== null && (
                  <ReferenceLine
                    y={baseline}
                    stroke={baselineColor}
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="value"
                  name={valueLabel}
                  stroke={lineColor}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: lineColor,
                  }}
                  activeDot={{
                    r: 6,
                  }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[220px] items-center justify-center">
            <div className="text-center">
              <Activity
                size={22}
                className="mx-auto text-[#A5ADA9]"
              />

              <p className="mt-3 text-xs font-semibold text-[#687470]">
                Awaiting usable data
              </p>

              <p className="mt-1 text-[11px] text-[#8A9290]">
                More processed check-ins will
                appear here.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: lineColor,
            }}
          />

          <span className="text-[11px] text-[#687470]">
            Check-in measurement
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="h-0.5 w-4"
            style={{
              backgroundColor: baselineColor,
            }}
          />

          <span className="text-[11px] text-[#8A9290]">
            Personal baseline
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#F7F4EC] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[#687470]">
            Personal baseline
          </span>

          <span className="text-xs font-semibold text-[#315C55]">
            {baseline !== null
              ? formatter(baseline)
              : "Not available"}
          </span>
        </div>
      </div>
    </section>
  );
}

export default function TrendsPage() {
  const params = useParams();

  const elderId = String(
    params?.id ?? ""
  );

  const [trajectory, setTrajectory] =
    useState<TrajectoryResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

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

        const response =
          await apiFetch(
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

  const chartData = useMemo(
    () =>
      normalizeTrajectory(
        trajectory
      ),
    [trajectory]
  );

  const baseline =
    trajectory?.baseline ?? null;

  const overallStatus =
    formatStatus(
      trajectory?.status
    );

  const observationCount =
    typeof trajectory?.observation_count ===
    "number"
      ? trajectory.observation_count
      : chartData.length;

  const latest =
    chartData.length > 0
      ? chartData[chartData.length - 1]
      : null;

  const speakingRateData =
    chartData.map((item) => ({
      date: item.date,
      value: item.speakingRate,
    }));

  const pauseDensityData =
    chartData.map((item) => ({
      date: item.date,
      value: item.pauseDensity,
    }));

  const lexicalDiversityData =
    chartData.map((item) => ({
      date: item.date,
      value: item.lexicalDiversity,
    }));

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
        <div className="mx-auto max-w-6xl px-5 py-6 pb-36 sm:px-8 lg:px-12 lg:py-10 lg:pb-12">

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
            <section className="mt-7 rounded-3xl border border-[#E8DDD4] bg-white p-6 sm:p-8">
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

            <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-[#F8E7D8]/50 blur-3xl" />

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
                  ? "We are retrieving the elder's longitudinal speech data."
                  : "This view compares usable conversations with the elder's own personal baseline."}
              </p>
            </div>
          </section>

          {/* SUMMARY */}

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
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

            <section className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8E7D8] text-[#A86A43]">
                  <CalendarDays size={19} />
                </div>

                <div>
                  <p className="text-xs text-[#8A9290]">
                    Check-ins reviewed
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#263331]">
                    {loading
                      ? "Loading..."
                      : observationCount}
                  </p>
                </div>
              </div>
            </section>

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
                    {latest
                      ? formatDate(
                          latest.date
                        )
                      : "Awaiting data"}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* METRIC TRENDS */}

          <section className="mt-7">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#176B5F]">
                Conversation patterns
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Personal trend
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7A8582]">
                Each indicator is shown on its own scale so
                the measurements remain easy to interpret.
                The dashed line represents the elder&apos;s
                personal baseline.
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-[#DCDDD9] bg-[#FBFAF7]">
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
              <div className="grid gap-5 lg:grid-cols-3">

                <MetricChart
                  title="Speaking rate"
                  description="Approximate number of spoken words per minute."
                  icon={<TrendingUp size={18} />}
                  valueLabel="WPM"
                  value={
                    latest?.speakingRate ??
                    null
                  }
                  baseline={
                    baseline?.speaking_rate_mean ??
                    null
                  }
                  data={speakingRateData}
                  formatter={(value) =>
                    value.toFixed(1)
                  }
                  iconBg="bg-[#EAF2EE]"
                  iconColor="text-[#176B5F]"
                  lineColor="#176B5F"
                  baselineColor="#8FB3A8"
                />

                <MetricChart
                  title="Pause density"
                  description="Frequency of detected pauses during speech."
                  icon={<Clock3 size={18} />}
                  valueLabel="Pause density"
                  value={
                    latest?.pauseDensity ??
                    null
                  }
                  baseline={
                    baseline?.pause_density_mean ??
                    null
                  }
                  data={pauseDensityData}
                  formatter={(value) =>
                    value.toFixed(3)
                  }
                  iconBg="bg-[#F3F1EA]"
                  iconColor="text-[#8A6B54]"
                  lineColor="#6F9F92"
                  baselineColor="#A9BDB6"
                />

                <MetricChart
                  title="Lexical diversity"
                  description="Variety of words used across recorded conversations."
                  icon={<Activity size={18} />}
                  valueLabel="TTR"
                  value={
                    latest?.lexicalDiversity ??
                    null
                  }
                  baseline={
                    baseline?.lexical_diversity_mean ??
                    null
                  }
                  data={lexicalDiversityData}
                  formatter={(value) =>
                    value.toFixed(3)
                  }
                  iconBg="bg-[#F8E7D8]"
                  iconColor="text-[#A86A43]"
                  lineColor="#D78D5D"
                  baselineColor="#C9A58B"
                />

              </div>
            ) : (
              <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-dashed border-[#DCDDD9] bg-[#FBFAF7] px-6">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4F2] text-[#176B5F]">
                    <TrendingUp size={21} />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold">
                    Not enough usable trend data yet
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-[#8A9290]">
                    A trajectory appears when the backend
                    has enough processed check-ins and
                    speech measurements to compare
                    against a personal baseline.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* HOW THIS WORKS */}

          <section className="mt-7 rounded-3xl border border-[#DCE8E2] bg-[#EEF4F2] p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#176B5F] shadow-sm">
                <Lightbulb size={19} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#176B5F]">
                  How this works
                </p>

                <h2 className="mt-1 text-base font-semibold text-[#24584F]">
                  Personal baseline first
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#53615D]">
                  Kahaani-Check looks for patterns over
                  time relative to the individual&apos;s own
                  baseline. A single conversation should
                  not be treated as a standalone judgment.
                </p>
              </div>
            </div>
          </section>

          {/* HISTORY */}

          <section className="mt-7 rounded-3xl border border-[#E7E3D9] bg-[#FFFDF8] p-6 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#176B5F]">
              Your story over time
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              Conversation history
            </h2>

            <p className="mt-1 text-sm text-[#7A8582]">
              Processed check-ins contribute to the
              longitudinal view.
            </p>

            {chartData.length > 0 ? (
              <div className="mt-6 space-y-3">
                {chartData
                  .slice()
                  .reverse()
                  .map((item, index) => (
                    <div
                      key={`${item.date}-${index}`}
                      className="flex flex-col gap-3 rounded-2xl border border-[#EEECE7] bg-[#FBFAF7] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4F2] text-[#176B5F]">
                          <MessageCircle
                            size={17}
                          />
                        </div>

                        <div>
                          <p className="text-sm font-semibold">
                            {formatDate(
                              item.date
                            )}
                          </p>

                          <p className="text-xs text-[#8A9290]">
                            Processed conversation
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {item.speakingRate !==
                          null && (
                          <span className="rounded-full bg-[#EAF2EE] px-3 py-1 text-[#315C55]">
                            {item.speakingRate.toFixed(
                              1
                            )}{" "}
                            WPM
                          </span>
                        )}

                        {item.pauseDensity !==
                          null && (
                          <span className="rounded-full bg-[#F3F1EA] px-3 py-1 text-[#687470]">
                            Pause{" "}
                            {item.pauseDensity.toFixed(
                              3
                            )}
                          </span>
                        )}

                        {item.lexicalDiversity !==
                          null && (
                          <span className="rounded-full bg-[#F8E7D8] px-3 py-1 text-[#A86A43]">
                            Diversity{" "}
                            {item.lexicalDiversity.toFixed(
                              3
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-[#DCDDD9] bg-[#FBFAF7] p-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF4F2] text-[#176B5F]">
                  <MessageCircle size={18} />
                </div>

                <h3 className="mt-4 text-sm font-semibold">
                  No usable conversation history yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#8A9290]">
                  Completed and successfully processed
                  check-ins will appear here when
                  trajectory data is available.
                </p>
              </div>
            )}
          </section>

          {/* TAKEAWAY */}

          <section className="relative mt-7 overflow-hidden rounded-3xl border border-[#DCE8E2] bg-[#EEF4F2] p-6 sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/50 blur-2xl" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#176B5F] shadow-sm">
                <Lightbulb size={21} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#176B5F]">
                  A gentle takeaway
                </p>

                <h2 className="mt-1 text-lg font-semibold text-[#24584F]">
                  Trends need enough context
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#53615D]">
                  Kahaani-Check is designed to look at
                  patterns over time. Individual check-ins
                  should not be treated as standalone
                  judgments.
                </p>
              </div>
            </div>
          </section>

          {/* SAFETY */}

          <section className="mt-5 rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8E7D8] text-[#A86A43]">
                <Heart size={16} />
              </div>

              <div>
                <h2 className="text-sm font-semibold">
                  Remember
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#7A8582]">
                  Kahaani-Check is not a diagnostic tool.
                  Changes in speech should be discussed with
                  a qualified healthcare professional when
                  appropriate.
                </p>
              </div>
            </div>
          </section>

          <p className="mx-auto mt-7 max-w-lg text-center text-xs leading-5 text-[#8A9290]">
            Synthetic or staged demonstration data
            should not be interpreted as clinical
            validation.
          </p>
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