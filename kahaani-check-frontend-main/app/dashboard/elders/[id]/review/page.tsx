"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Activity,
  Home,
  Users,
  ClipboardCheck,
  Lightbulb,
  Settings,
  Heart,
  Loader2,
  Phone,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";

interface CheckinRecord {
  id?: string;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  scheduled_for?: string | null;
  scheduled_at?: string | null;
  [key: string]: unknown;
}

interface TrajectoryResponse {
  [key: string]: unknown;
}

function findValue(
  source: unknown,
  keys: string[]
): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const object = source as Record<string, unknown>;

  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(
        object,
        key
      )
    ) {
      return object[key];
    }
  }

  for (const value of Object.values(object)) {
    if (
      value &&
      typeof value === "object"
    ) {
      const found = findValue(value, keys);

      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}

function findArray(
  source: unknown,
  keys: string[]
): unknown[] | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const object = source as Record<string, unknown>;

  for (const key of keys) {
    if (Array.isArray(object[key])) {
      return object[key] as unknown[];
    }
  }

  for (const value of Object.values(object)) {
    if (
      value &&
      typeof value === "object"
    ) {
      const found = findArray(
        value,
        keys
      );

      if (found) {
        return found;
      }
    }
  }

  return null;
}

function getString(
  source: unknown,
  keys: string[]
): string | null {
  const value = findValue(source, keys);

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value;
  }

  return null;
}

function getNumber(
  source: unknown,
  keys: string[]
): number | null {
  const value = findValue(source, keys);

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function formatStatus(
  value: unknown
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return "Insufficient evidence";
  }

  const normalized =
    value.toLowerCase();

  if (
    normalized.includes("change") ||
    normalized.includes("review")
  ) {
    return "Change worth reviewing";
  }

  if (
    normalized.includes("stable")
  ) {
    return "Stable compared with baseline";
  }

  if (
    normalized.includes("insufficient")
  ) {
    return "Insufficient evidence";
  }

  if (
    normalized.includes("technical") ||
    normalized.includes("failure")
  ) {
    return "Technical issue";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function isReviewStatus(
  value: string
): boolean {
  const normalized =
    value.toLowerCase();

  return (
    normalized.includes("change") ||
    normalized.includes("review")
  );
}


function normalizeCheckins(
  response: unknown
): CheckinRecord[] {
  const array = Array.isArray(response)
    ? response
    : findArray(response, [
        "check_ins",
        "checkins",
        "data",
        "records",
      ]);

  if (!array) {
    return [];
  }

  return array.filter(
    (item): item is CheckinRecord =>
      Boolean(
        item &&
          typeof item === "object"
      )
  );
}

export default function ReviewPage() {
  const params = useParams();

  const elderId = String(
    params?.id ?? ""
  );

  const [trajectory, setTrajectory] =
    useState<TrajectoryResponse | null>(
      null
    );

  const [checkins, setCheckins] =
    useState<CheckinRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadReviewData() {
      if (!elderId) {
        setError(
          "Elder ID is missing."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          trajectoryResponse,
          checkinsResponse,
        ] = await Promise.all([
          apiFetch(
            `/v1/elders/${elderId}/trajectory`
          ),
          apiFetch(
            `/v1/check-ins/elder/${elderId}`
          ),
        ]);

        setTrajectory(
          trajectoryResponse as TrajectoryResponse
        );

        setCheckins(
          normalizeCheckins(
            checkinsResponse
          )
        );
      } catch (err) {
        console.error(
          "Failed to load review data:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load review information."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReviewData();
  }, [elderId]);

  const trajectoryStatus = formatStatus(
    getString(trajectory, [
      "overall_status",
      "longitudinal_status",
      "trajectory_status",
      "status",
      "analysis_status",
    ])
  );

  const baselineSampleCount =
    getNumber(trajectory, [
      "sample_count",
      "baseline_sample_count",
      "usable_checkins",
      "checkin_count",
    ]);

  const consecutiveChanges =
    getNumber(trajectory, [
      "consecutive_changes",
      "consecutive_change_count",
    ]);

  const featureChangeCount =
    getNumber(trajectory, [
      "changed_feature_count",
      "significant_feature_count",
      "features_changed",
    ]);

  const qualityBand =
    getString(trajectory, [
      "quality_band",
      "data_quality",
      "quality",
      "confidence_band",
    ]);

  const confounder =
    getString(trajectory, [
      "confounder",
      "confounders",
      "context",
      "context_flag",
    ]);

  const reason =
    getString(trajectory, [
      "reason",
      "review_reason",
      "explanation",
      "summary",
    ]);

  const needsReview =
    isReviewStatus(
      trajectoryStatus
    );

  const completedCheckins =
    useMemo(() => {
      return checkins.filter(
        (checkin) => {
          const status =
            String(
              checkin.status ?? ""
            ).toLowerCase();

          return (
            status === "completed" ||
            status === "processed" ||
            status === "complete"
          );
        }
      );
    }, [checkins]);

  const recentCheckins =
    checkins.length;

  return (
    <main className="min-h-screen bg-[#F8F7F4] text-[#263331]">

      {/* =====================================
          DESKTOP SIDEBAR
      ===================================== */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-[#E5E3DE] bg-white px-5 py-6 lg:block">

        <div className="flex items-center gap-3 px-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#315C55] font-semibold text-white">
            K
          </div>

          <div>
            <h1 className="font-semibold text-[#263331]">
              Kahaani-Check
            </h1>

            <p className="text-xs text-[#8A9290]">
              Caregiver
            </p>
          </div>

        </div>

        <nav className="mt-10 space-y-2">

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#697572] transition hover:bg-[#F7F7F5]"
          >
            <Home size={18} />
            My Family
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#697572] transition hover:bg-[#F7F7F5]"
          >
            <Users size={18} />
            Elders
          </Link>

          <Link
            href={`/dashboard/elders/${elderId}/checkins`}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#697572] transition hover:bg-[#F7F7F5]"
          >
            <ClipboardCheck size={18} />
            Check-ins
          </Link>

          <Link
            href={`/dashboard/elders/${elderId}/trends`}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#697572] transition hover:bg-[#F7F7F5]"
          >
            <Lightbulb size={18} />
            Trends
          </Link>

          <Link
            href={`/dashboard/elders/${elderId}/review`}
            className="flex items-center gap-3 rounded-xl bg-[#FFF4D9] px-4 py-3 text-sm font-medium text-[#8A691C]"
          >
            <AlertCircle size={18} />
            Review
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#697572] transition hover:bg-[#F7F7F5]"
          >
            <Settings size={18} />
            Settings
          </Link>

        </nav>

      </aside>

      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <section className="pb-20 lg:ml-64 lg:pb-0">

        <header className="border-b border-[#E5E3DE] bg-white px-5 py-4 lg:px-10 lg:py-5">

          <div className="mx-auto max-w-5xl">

            <Link
              href={`/dashboard/elders/${elderId}`}
              className="inline-flex items-center gap-2 text-sm text-[#687470] transition hover:text-[#315C55]"
            >
              <ArrowLeft size={16} />
              Back to profile
            </Link>

          </div>

        </header>

        <div className="mx-auto max-w-5xl px-5 py-8 lg:px-10 lg:py-10">

          {/* =====================================
              PAGE HEADING
          ===================================== */}

          <div>

            <p className="text-sm text-[#8A9290]">
              Caregiver review
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Changes worth reviewing
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#707B78]">
              Review longitudinal information that
              may be useful to discuss with a qualified
              healthcare professional.
            </p>

          </div>

          {/* =====================================
              ERROR
          ===================================== */}

          {error && (
            <section className="mt-7 rounded-3xl border border-[#E8DDD4] bg-white p-6">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8E7D8] text-[#A86A43]">
                  <AlertCircle size={21} />
                </div>

                <div>

                  <h2 className="font-semibold">
                    We couldn&apos;t load the review
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#7A8582]">
                    {error}
                  </p>

                </div>

              </div>

            </section>
          )}

          {/* =====================================
              SUMMARY
          ===================================== */}

          <div className="mt-8 grid gap-3 sm:grid-cols-3">

            <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">

              <p className="text-sm text-[#7A8582]">
                Needs review
              </p>

              <p className="mt-2 text-2xl font-semibold text-[#263331]">
                {loading
                  ? "—"
                  : needsReview
                    ? "1"
                    : "0"}
              </p>

              <p className="mt-1 text-xs text-[#A0A7A4]">
                Based on current trajectory
              </p>

            </div>

            <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">

              <p className="text-sm text-[#7A8582]">
                Current status
              </p>

              <p className="mt-2 text-lg font-semibold text-[#315C55]">
                {loading
                  ? "Loading..."
                  : trajectoryStatus}
              </p>

              <p className="mt-1 text-xs text-[#A0A7A4]">
                Personal baseline comparison
              </p>

            </div>

            <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">

              <p className="text-sm text-[#7A8582]">
                Recent check-ins
              </p>

              <p className="mt-2 text-2xl font-semibold text-[#263331]">
                {loading
                  ? "—"
                  : recentCheckins}
              </p>

              <p className="mt-1 text-xs text-[#A0A7A4]">
                {completedCheckins.length} completed
              </p>

            </div>

          </div>

          {/* =====================================
              REVIEW RESULT
          ===================================== */}

          <section className="mt-10">

            <h2 className="text-lg font-semibold">
              Needs your attention
            </h2>

            {loading ? (

              <div className="mt-4 rounded-3xl border border-[#E5E3DE] bg-white px-6 py-14 text-center">

                <Loader2
                  size={24}
                  className="mx-auto animate-spin text-[#315C55]"
                />

                <p className="mt-4 text-sm font-medium">
                  Loading review information
                </p>

                <p className="mt-1 text-xs text-[#8A9290]">
                  Comparing available check-ins with
                  the personal baseline...
                </p>

              </div>

            ) : needsReview ? (

              <div className="mt-4 rounded-3xl border border-[#EADFC8] bg-[#FFFDF8] p-6 sm:p-8">

                <div className="flex items-start gap-4">

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0D7] text-[#A86A43]">
                    <AlertCircle size={25} />
                  </div>

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A86A43]">
                      Review information
                    </p>

                    <h3 className="mt-1 text-xl font-semibold text-[#263331]">
                      Change worth reviewing
                    </h3>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687470]">
                      The current trajectory shows
                      speech changes relative to the
                      person&apos;s own baseline. This is
                      information to discuss with a
                      qualified healthcare professional,
                      not a diagnosis.
                    </p>

                  </div>

                </div>

                {/* Reason */}

                <div className="mt-7 grid gap-4 sm:grid-cols-2">

                  <div className="rounded-2xl bg-[#FBF8F0] p-5">

                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8A9290]">
                      Why it is being shown
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#52615D]">
                      {reason ??
                        "The trajectory contains a change that is worth reviewing against the personal baseline."}
                    </p>

                  </div>

                  <div className="rounded-2xl bg-[#FBF8F0] p-5">

                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8A9290]">
                      Data quality
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#315C55]">
                      {qualityBand ??
                        "See individual check-in quality"}
                    </p>

                  </div>

                </div>

                {/* Supporting data */}

                <div className="mt-4 grid gap-4 sm:grid-cols-3">

                  <div className="rounded-2xl border border-[#EEECE7] bg-white p-4">

                    <p className="text-xs text-[#8A9290]">
                      Baseline samples
                    </p>

                    <p className="mt-2 text-lg font-semibold">
                      {baselineSampleCount !== null
                        ? Math.round(
                            baselineSampleCount
                          )
                        : "—"}
                    </p>

                  </div>

                  <div className="rounded-2xl border border-[#EEECE7] bg-white p-4">

                    <p className="text-xs text-[#8A9290]">
                      Consecutive changes
                    </p>

                    <p className="mt-2 text-lg font-semibold">
                      {consecutiveChanges !== null
                        ? Math.round(
                            consecutiveChanges
                          )
                        : "—"}
                    </p>

                  </div>

                  <div className="rounded-2xl border border-[#EEECE7] bg-white p-4">

                    <p className="text-xs text-[#8A9290]">
                      Features changed
                    </p>

                    <p className="mt-2 text-lg font-semibold">
                      {featureChangeCount !== null
                        ? Math.round(
                            featureChangeCount
                          )
                        : "—"}
                    </p>

                  </div>

                </div>

                {/* Context */}

                {confounder && (
                  <div className="mt-4 rounded-2xl bg-[#F3F8F6] p-5">

                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#315C55]">
                      Context to consider
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#687470]">
                      {confounder}
                    </p>

                  </div>
                )}

                {/* Next step */}

                <div className="mt-6 rounded-2xl bg-[#EEF4F2] p-5">

                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#176B5F]">
                    Suggested next step
                  </p>

                  <p className="mt-2 text-sm font-medium text-[#315C55]">
                    Consider discussing the observed
                    change with a qualified healthcare
                    professional.
                  </p>

                </div>

                <div className="mt-6 flex flex-wrap gap-3">

                  <Link
                    href={`/dashboard/elders/${elderId}/trends`}
                    className="inline-flex items-center justify-center rounded-xl bg-[#176B5F] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#12584F]"
                  >
                    <Activity
                      size={16}
                      className="mr-2"
                    />
                    View trends
                  </Link>

                  <Link
                    href={`/dashboard/elders/${elderId}/checkins`}
                    className="inline-flex items-center justify-center rounded-xl border border-[#DCDDD9] bg-white px-5 py-3 text-sm font-medium text-[#315C55] transition hover:bg-[#F7F7F5]"
                  >
                    <MessageCircle
                      size={16}
                      className="mr-2"
                    />
                    View check-ins
                  </Link>

                </div>

              </div>

            ) : (

              <div className="mt-4 rounded-3xl border border-dashed border-[#D9DDD9] bg-white px-6 py-12 text-center sm:px-10">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4F2] text-[#315C55]">

                  {trajectoryStatus.includes(
                    "Stable"
                  ) ? (
                    <CheckCircle2 size={23} />
                  ) : (
                    <AlertCircle size={23} />
                  )}

                </div>

                <h3 className="mt-5 text-lg font-semibold">
                  {trajectoryStatus}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7A8582]">
                  {trajectoryStatus.includes(
                    "Stable"
                  )
                    ? "No change currently meets the review criteria in the available trajectory."
                    : "There is not enough evidence to create a review item from the available check-ins."}
                </p>

                <Link
                  href={`/dashboard/elders/${elderId}/trends`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#315C55]"
                >
                  View conversation patterns
                  <ArrowLeft
                    size={15}
                    className="rotate-180"
                  />
                </Link>

              </div>

            )}

          </section>

          {/* =====================================
              CURRENT INFORMATION
          ===================================== */}

          <section className="mt-8">

            <h2 className="text-lg font-semibold">
              Current information
            </h2>

            <div className="mt-4 rounded-2xl border border-[#E5E3DE] bg-white p-6">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4F2] text-[#315C55]">
                  <CheckCircle2 size={20} />
                </div>

                <div>

                  <p className="font-medium text-[#52615D]">
                    Longitudinal monitoring
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#7A8582]">
                    Kahaani-Check compares speech
                    patterns against the individual&apos;s
                    personal baseline. It does not make
                    a medical diagnosis.
                  </p>

                  <Link
                    href={`/dashboard/elders/${elderId}/trends`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#315C55] transition hover:text-[#12584F]"
                  >
                    View conversation patterns
                  </Link>

                </div>

              </div>

            </div>

          </section>

          {/* =====================================
              GENTLE REMINDER
          ===================================== */}

          <section className="mt-8 rounded-2xl border border-[#DCE8E2] bg-[#EEF4F2] p-6">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#315C55]">
                <Heart size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-[#315C55]">
                  A gentle reminder
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#55706B]">
                  Changes in communication can have
                  many possible causes. Illness, sleep,
                  hearing difficulty, medication changes,
                  fatigue, dialect, and recording quality
                  may all be relevant when interpreting
                  future results.
                </p>

              </div>

            </div>

          </section>

          {/* =====================================
              SAFETY
          ===================================== */}

          <section className="mt-5 rounded-2xl border border-[#E5E3DE] bg-white p-5">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8E7D8] text-[#A86A43]">
                <AlertCircle size={16} />
              </div>

              <div>

                <h2 className="text-sm font-semibold">
                  Important
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#7A8582]">
                  Kahaani-Check is not a diagnostic
                  tool. It may identify changes in
                  speech that should be discussed with
                  a healthcare professional.
                </p>

              </div>

            </div>

          </section>

          {/* =====================================
              BACKEND DATA NOTE
          ===================================== */}

          <section className="mt-5 rounded-2xl border border-dashed border-[#D9D7D0] bg-[#FFFDF8] p-5">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F1EA] text-[#7A8582]">
                <Phone size={16} />
              </div>

              <div>

                <h2 className="text-sm font-semibold text-[#52615D]">
                  Review data source
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#8A9290]">
                  This page uses the authenticated
                  caregiver&apos;s trajectory and check-in
                  history from the Kahaani-Check backend.
                </p>

                <p className="mt-2 break-all text-[11px] text-[#A0A7A4]">
                  Elder ID: {elderId}
                </p>

              </div>

            </div>

          </section>

        </div>

      </section>

      {/* =====================================
          MOBILE NAVIGATION
      ===================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[#E5E3DE] bg-white lg:hidden">

        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-1 text-[10px] text-[#8A9290]"
        >
          <Home size={17} />
          <span>Home</span>
        </Link>

        <Link
          href="/dashboard/elders"
          className="flex flex-col items-center gap-1 text-[10px] text-[#8A9290]"
        >
          <Users size={17} />
          <span>Elders</span>
        </Link>

        <Link
          href={`/dashboard/elders/${elderId}/checkins`}
          className="flex flex-col items-center gap-1 text-[10px] text-[#8A9290]"
        >
          <ClipboardCheck size={17} />
          <span>Check-ins</span>
        </Link>

        <Link
          href={`/dashboard/elders/${elderId}/trends`}
          className="flex flex-col items-center gap-1 text-[10px] text-[#8A9290]"
        >
          <Lightbulb size={17} />
          <span>Insights</span>
        </Link>

      </nav>

    </main>
  );
}