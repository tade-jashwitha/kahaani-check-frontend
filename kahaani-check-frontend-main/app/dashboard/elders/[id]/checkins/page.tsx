"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Clock3,
  CalendarDays,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";

interface BackendElder {
  id: string;
  display_name: string;
  phone_e164: string;
  preferred_call_language: string;
  dob_year_range: string | null;
  timezone: string;
  status: string;
  created_at: string;
}

interface BackendCheckin {
  id?: string;
  check_in_id?: string;
  elder_id?: string;

  scheduled_for?: string | null;
  scheduled_at?: string | null;
  created_at?: string | null;
  completed_at?: string | null;

  status?: string | null;
  analysis_status?: string | null;
  longitudinal_status?: string | null;

  recording_id?: string | null;
  has_recording?: boolean;

  [key: string]: unknown;
}

interface Checkin {
  id: string;
  scheduledAt: string | null;
  createdAt: string | null;
  completedAt: string | null;
  status: string;
  analysisStatus: string | null;
  hasRecording: boolean;
}

function getCheckinId(checkin: BackendCheckin) {
  return String(
    checkin.id ??
      checkin.check_in_id ??
      ""
  );
}

function mapCheckin(
  checkin: BackendCheckin
): Checkin | null {
  const id = getCheckinId(checkin);

  if (!id) {
    return null;
  }

  return {
    id,
    scheduledAt:
      checkin.scheduled_for ??
      checkin.scheduled_at ??
      null,
    createdAt: checkin.created_at ?? null,
    completedAt:
      checkin.completed_at ?? null,
    status:
      checkin.status ??
      "scheduled",
    analysisStatus:
      checkin.analysis_status ??
      checkin.longitudinal_status ??
      null,
    hasRecording:
      Boolean(
        checkin.has_recording ??
          checkin.recording_id
      ),
  };
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Date not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatTime(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function formatStatus(
  status: string
) {
  const normalized =
    status.toLowerCase();

  if (
    normalized === "completed" ||
    normalized === "processed" ||
    normalized === "complete"
  ) {
    return {
      label: "Completed",
      type: "completed" as const,
    };
  }

  if (
    normalized === "processing" ||
    normalized === "pending"
  ) {
    return {
      label: "Processing",
      type: "processing" as const,
    };
  }

  if (
    normalized === "failed" ||
    normalized === "error"
  ) {
    return {
      label: "Needs attention",
      type: "failed" as const,
    };
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return {
      label: "Cancelled",
      type: "failed" as const,
    };
  }

  return {
    label:
      status.charAt(0).toUpperCase() +
      status.slice(1),
    type: "scheduled" as const,
  };
}

export default function CheckinsPage() {
  const params = useParams();

  const elderId = String(params.id);

  const [elderName, setElderName] =
    useState("Family member");

  const [checkins, setCheckins] =
    useState<Checkin[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          elderResponse,
          checkinsResponse,
        ] = await Promise.all([
          apiFetch(
            `/v1/elders/${elderId}`
          ),
          apiFetch(
            `/v1/check-ins/elder/${elderId}`
          ),
        ]);

        const elder =
          elderResponse as BackendElder;

        setElderName(
          elder.display_name ||
            "Family member"
        );

        let rawCheckins: BackendCheckin[] = [];

        if (
          Array.isArray(checkinsResponse)
        ) {
          rawCheckins =
            checkinsResponse as BackendCheckin[];
        } else if (
          checkinsResponse &&
          typeof checkinsResponse ===
            "object"
        ) {
          const response =
            checkinsResponse as {
              items?: BackendCheckin[];
              checkins?: BackendCheckin[];
              data?: BackendCheckin[];
            };

          if (
            Array.isArray(response.items)
          ) {
            rawCheckins =
              response.items;
          } else if (
            Array.isArray(
              response.checkins
            )
          ) {
            rawCheckins =
              response.checkins;
          } else if (
            Array.isArray(response.data)
          ) {
            rawCheckins =
              response.data;
          }
        }

        const mappedCheckins =
          rawCheckins
            .map(mapCheckin)
            .filter(
              (
                checkin
              ): checkin is Checkin =>
                checkin !== null
            );

        setCheckins(mappedCheckins);
      } catch (err) {
        console.error(
          "Failed to load check-ins:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load check-ins."
        );
      } finally {
        setLoading(false);
      }
    }

    if (elderId) {
      loadData();
    }
  }, [elderId]);

  const completedCount =
    useMemo(() => {
      return checkins.filter(
        (checkin) => {
          const status =
            checkin.status.toLowerCase();

          return (
            status === "completed" ||
            status === "processed" ||
            status === "complete"
          );
        }
      ).length;
    }, [checkins]);

  const currentStatus =
    useMemo(() => {
      if (checkins.length === 0) {
        return "—";
      }

      const latest =
        checkins[0];

      if (
        latest.analysisStatus
      ) {
        return latest.analysisStatus;
      }

      return formatStatus(
        latest.status
      ).label;
    }, [checkins]);

  return (
    <main className="min-h-screen bg-[#F8F7F4] text-[#263331]">

      {/* =====================================
          DESKTOP SIDEBAR
      ===================================== */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-[#E5E3DE] bg-white px-5 py-6 lg:block">

        {/* Logo */}

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

        {/* Navigation */}

        <nav className="mt-10 space-y-2">

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#697572] transition hover:bg-[#F7F7F5]"
          >
            <span>My Family</span>
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#697572] transition hover:bg-[#F7F7F5]"
          >
            <span>Elders</span>
          </Link>

          <Link
            href={`/dashboard/elders/${elderId}/checkins`}
            className="flex items-center gap-3 rounded-xl bg-[#EEF4F2] px-4 py-3 text-sm font-medium text-[#315C55]"
          >
            <Phone size={18} />
            <span>Check-ins</span>
          </Link>

          <Link
            href={`/dashboard/elders/${elderId}/trends`}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#697572] transition hover:bg-[#F7F7F5]"
          >
            <span>Trends</span>
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#697572] transition hover:bg-[#F7F7F5]"
          >
            <span>Settings</span>
          </Link>

        </nav>

      </aside>

      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <section className="pb-20 lg:ml-64 lg:pb-0">

        {/* Header */}

        <header className="border-b border-[#E5E3DE] bg-white px-5 py-4 lg:px-10 lg:py-5">

          <div className="mx-auto max-w-5xl">

            <Link
              href={`/dashboard/elders/${elderId}`}
              className="inline-flex items-center gap-2 text-sm text-[#687470] transition hover:text-[#315C55]"
            >
              <ArrowLeft size={16} />
              Back to {elderName}
            </Link>

          </div>

        </header>

        {/* Page Content */}

        <div className="mx-auto max-w-5xl px-5 py-7 lg:px-10 lg:py-8">

          {/* =====================================
              TITLE
          ===================================== */}

          <div>

            <p className="text-sm text-[#8A9290]">
              {elderName}
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#263331]">
              Check-ins
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#707B78]">
              Review recorded conversations
              and their analysis over time.
            </p>

          </div>

          {/* =====================================
              SUMMARY CARDS
          ===================================== */}

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">

            {/* Total */}

            <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">

              <div className="flex items-center justify-between">

                <p className="text-sm text-[#7A8582]">
                  Total check-ins
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4F2] text-[#315C55]">
                  <CalendarDays size={17} />
                </div>

              </div>

              <p className="mt-3 text-2xl font-semibold text-[#263331]">
                {loading
                  ? "—"
                  : checkins.length}
              </p>

            </div>

            {/* Completed */}

            <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">

              <div className="flex items-center justify-between">

                <p className="text-sm text-[#7A8582]">
                  Completed
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4F2] text-[#315C55]">
                  <Phone size={17} />
                </div>

              </div>

              <p className="mt-3 text-2xl font-semibold text-[#263331]">
                {loading
                  ? "—"
                  : completedCount}
              </p>

            </div>

            {/* Current status */}

            <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">

              <div className="flex items-center justify-between">

                <p className="text-sm text-[#7A8582]">
                  Current status
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F1ED] text-[#8A9290]">
                  <Clock3 size={17} />
                </div>

              </div>

              <p className="mt-3 truncate text-lg font-semibold text-[#687470]">
                {loading
                  ? "—"
                  : currentStatus}
              </p>

            </div>

          </div>

          {/* =====================================
              LOADING
          ===================================== */}

          {loading && (
            <div className="mt-9 rounded-3xl border border-[#E5E3DE] bg-white px-6 py-14 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4F2] text-[#315C55]">

                <Loader2
                  size={24}
                  className="animate-spin"
                />

              </div>

              <h3 className="mt-5 text-base font-semibold text-[#263331]">
                Loading check-ins...
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7A8582]">
                Getting the latest conversation
                history securely.
              </p>

            </div>
          )}

          {/* =====================================
              ERROR
          ===================================== */}

          {!loading && error && (
            <div className="mt-9 rounded-3xl border border-[#E8DDD4] bg-white px-6 py-14 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8E7D8] text-[#A86A43]">
                <AlertCircle size={24} />
              </div>

              <h3 className="mt-5 text-base font-semibold text-[#263331]">
                We couldn&apos;t load the check-ins
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#7A8582]">
                {error}
              </p>

              <p className="mx-auto mt-3 max-w-lg text-xs leading-5 text-[#9A8582]">
                The elder profile itself can still
                be viewed. Please check that the
                backend check-in endpoint is running.
              </p>

            </div>
          )}

          {/* =====================================
              CHECK-IN HISTORY
          ===================================== */}

          {!loading &&
            !error &&
            checkins.length > 0 && (
              <div className="mt-9">

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="text-lg font-semibold text-[#263331]">
                      Recent check-ins
                    </h3>

                    <p className="mt-1 text-sm text-[#8A9290]">
                      Your recorded conversations.
                    </p>
                  </div>

                </div>

                <div className="mt-4 overflow-hidden rounded-3xl border border-[#E5E3DE] bg-white">

                  <div className="divide-y divide-[#E9E7E2]">

                    {checkins.map(
                      (checkin) => {
                        const status =
                          formatStatus(
                            checkin.status
                          );

                        const date =
                          checkin.scheduledAt ??
                          checkin.createdAt;

                        return (
                          <Link
                            key={checkin.id}
                            href={`/dashboard/elders/${elderId}/checkins/${checkin.id}`}
                            className="group flex items-center gap-4 px-5 py-5 transition hover:bg-[#F8FAF8] sm:px-6"
                          >

                            {/* ICON */}

                            <div
                              className={`
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl

                                ${
                                  status.type ===
                                  "completed"
                                    ? "bg-[#EEF4F2] text-[#315C55]"
                                    : status.type ===
                                        "failed"
                                      ? "bg-[#F8E7D8] text-[#A86A43]"
                                      : "bg-[#F3F2ED] text-[#7A8582]"
                                }
                              `}
                            >
                              {status.type ===
                              "completed" ? (
                                <CheckCircle2
                                  size={19}
                                />
                              ) : (
                                <Phone
                                  size={19}
                                />
                              )}
                            </div>

                            {/* INFO */}

                            <div className="min-w-0 flex-1">

                              <div className="flex flex-wrap items-center gap-2">

                                <p className="text-sm font-semibold text-[#263331]">
                                  Check-in
                                </p>

                                <span
                                  className={`
                                    rounded-full
                                    px-2.5
                                    py-1
                                    text-[10px]
                                    font-semibold

                                    ${
                                      status.type ===
                                      "completed"
                                        ? "bg-[#EEF4F2] text-[#315C55]"
                                        : status.type ===
                                            "failed"
                                          ? "bg-[#F8E7D8] text-[#A86A43]"
                                          : "bg-[#F2F1ED] text-[#687470]"
                                    }
                                  `}
                                >
                                  {status.label}
                                </span>

                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8A9290]">

                                <span>
                                  {formatDate(
                                    date
                                  )}
                                </span>

                                {formatTime(
                                  date
                                ) && (
                                  <span>
                                    {formatTime(
                                      date
                                    )}
                                  </span>
                                )}

                                {checkin.hasRecording && (
                                  <span className="text-[#315C55]">
                                    Audio available
                                  </span>
                                )}

                              </div>

                              {checkin.analysisStatus && (
                                <p className="mt-2 text-xs text-[#687470]">
                                  Analysis:{" "}
                                  {
                                    checkin.analysisStatus
                                  }
                                </p>
                              )}

                            </div>

                            {/* ARROW */}

                            <ChevronRight
                              size={18}
                              className="shrink-0 text-[#A0A8A5] transition group-hover:translate-x-0.5 group-hover:text-[#315C55]"
                            />

                          </Link>
                        );
                      }
                    )}

                  </div>

                </div>

              </div>
            )}

          {/* =====================================
              EMPTY STATE
          ===================================== */}

          {!loading &&
            !error &&
            checkins.length === 0 && (
              <div className="mt-9">

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="text-lg font-semibold text-[#263331]">
                      Recent check-ins
                    </h3>

                    <p className="mt-1 text-sm text-[#8A9290]">
                      Recorded conversations will
                      appear here.
                    </p>
                  </div>

                </div>

                <div className="mt-4 rounded-3xl border border-dashed border-[#D9DDD9] bg-white px-6 py-12 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4F2] text-[#315C55]">
                    <Phone size={23} />
                  </div>

                  <h4 className="mt-5 text-base font-semibold text-[#263331]">
                    No check-ins yet
                  </h4>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7A8582]">
                    Once a conversation is
                    recorded and processed, the
                    check-in will appear here with
                    its audio quality and analysis.
                  </p>

                </div>

              </div>
            )}

          {/* =====================================
              SAFETY / BACKEND NOTE
          ===================================== */}

          {!loading && (
            <div className="mt-8 rounded-2xl border border-[#DDE9E5] bg-[#F3F8F6] px-5 py-5">

              <p className="text-sm font-medium text-[#315C55]">
                Longitudinal check-in history
              </p>

              <p className="mt-1 text-xs leading-5 text-[#687470]">
                Check-in records, recordings,
                transcripts, speech features, and
                analysis results are loaded from the
                Kahaani-Check backend.
              </p>

              <p className="mt-3 text-xs leading-5 text-[#687470]">
                Kahaani-Check is not a diagnostic
                tool. Changes in speech should be
                discussed with a qualified healthcare
                professional when appropriate.
              </p>

            </div>
          )}

        </div>

      </section>

      {/* =====================================
          MOBILE BOTTOM NAVIGATION
      ===================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[#E5E3DE] bg-white lg:hidden">

        {/* Home */}

        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-1 text-[10px] text-[#8A9290]"
        >
          <span className="text-sm">
            ⌂
          </span>
          <span>Home</span>
        </Link>

        {/* Elders */}

        <Link
          href="/dashboard/elders"
          className="flex flex-col items-center gap-1 text-[10px] text-[#8A9290]"
        >
          <span className="text-sm">
            ♧
          </span>
          <span>Elders</span>
        </Link>

        {/* Check-ins */}

        <Link
          href={`/dashboard/elders/${elderId}/checkins`}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-[#315C55]"
        >
          <span className="text-sm">
            ▣
          </span>
          <span>Check-ins</span>
        </Link>

        {/* Insights */}

        <Link
          href={`/dashboard/elders/${elderId}/trends`}
          className="flex flex-col items-center gap-1 text-[10px] text-[#8A9290]"
        >
          <span className="text-sm">
            ♧
          </span>
          <span>Insights</span>
        </Link>

      </nav>

    </main>
  );
}