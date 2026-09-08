"use client";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileAudio,
  Loader2,
  RefreshCw,
  User,
} from "lucide-react";
import { useParams } from "next/navigation";

import VoiceRecorder from "@/app/components/checkins/VoiceRecorder";
import { apiFetch } from "@/app/lib/api";

type CheckIn = {
  id: string;
  elder_id?: string;
  status?: string;
  scheduled_for?: string;
  initiated_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  prompt?: string;
  language?: string;
  [key: string]: unknown;
};

type TranscriptData = {
  id?: string;
  call_recording_id?: string;
  text?: string;
  language?: string;
  model_name?: string;
  created_at?: string;
};

type AudioData = {
  id?: string;
  recording_id?: string;
  storage_path?: string;
  original_filename?: string;
  content_type?: string;
  size_bytes?: number;
  duration_seconds?: number;
  audio_quality?: Record<string, unknown>;
  transcript?: string | TranscriptData;
  analysis?: Record<string, unknown>;
  processing?: Record<string, unknown>;
  [key: string]: unknown;
};

type ApiError = {
  message?: string;
};

export default function CheckInDetailPage() {
  const params = useParams();

  const elderId = String(params?.id ?? "");
  const checkinId = String(params?.checkinId ?? "");

  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [audio, setAudio] = useState<AudioData | null>(null);

  const [loading, setLoading] = useState(true);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  const loadCheckIn = useCallback(async () => {
    if (!checkinId) {
      setError("Check-in ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const response = await apiFetch(
        `/v1/check-ins/${checkinId}`
      );

      setCheckIn(response as CheckIn);
    } catch (err) {
      console.error("Failed to load check-in:", err);

      const apiError = err as ApiError;

      setError(
        apiError?.message ||
          "Unable to load this check-in."
      );
    } finally {
      setLoading(false);
    }
  }, [checkinId]);

  const loadAudio = useCallback(  async () => {
    if (!checkinId) {
      return;
    }

    try {
      setAudioLoading(true);

      const response = await apiFetch(
        `/v1/check-ins/${checkinId}/audio`
      );

      setAudio(response as AudioData);
    } catch (err) {
      console.error("Failed to load audio:", err);

      // Audio may not exist yet.
      setAudio(null);
    } finally {
      setAudioLoading(false);
    }
  }, [checkinId]);

  const loadData = async () => {
    setRefreshing(true);

    await Promise.all([
      loadCheckIn(),
      loadAudio(),
    ]);

    setRefreshing(false);
  };

  useEffect(() => {
  loadCheckIn();
  loadAudio();
}, [checkinId, loadCheckIn, loadAudio]);

  const handleVoiceComplete = async (
    result: unknown | null      
  ) => {
    console.log(
      "Voice check-in completed:",
      result
    );

    setAudio(result as AudioData);

    // Refresh the check-in because the backend
    // changes its status after successful processing.
    await loadCheckIn();
  };

  const formatDate = (
    value?: string
  ) => {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatDateTime = (
    value?: string
  ) => {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  const formatStatus = (
    status?: string
  ) => {
    if (!status) {
      return "Unknown";
    }

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const status = checkIn?.status ?? "unknown";

  const isCompleted =
    status === "completed";

  

  const isProcessing =
    status === "initiated";
    const transcriptText =
  typeof audio?.transcript === "string"
    ? audio.transcript
    : audio?.transcript?.text ?? "";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F7F4]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#315C55]" />

            <p className="mt-4 text-sm text-[#687470]">
              Loading check-in...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !checkIn) {
    return (
      <main className="min-h-screen bg-[#F8F7F4]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Link
            href={
              elderId
                ? `/dashboard/elders/${elderId}/checkins`
                : "/dashboard"
            }
            className="inline-flex items-center gap-2 text-sm font-medium text-[#315C55] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to check-ins
          </Link>

          <div className="mt-8 rounded-3xl border border-[#E6E3DC] bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-[#263331]">
              Unable to load check-in
            </p>

            <p className="mt-2 text-sm text-[#687470]">
              {error}
            </p>

            <button
              type="button"
              onClick={loadData}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#315C55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#264A45]"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Back */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/elders/${elderId}/checkins`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#315C55] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to check-ins
          </Link>

          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-[#DCD9D1] bg-white px-4 py-2 text-sm font-medium text-[#687470] transition hover:border-[#315C55] hover:text-[#315C55] disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>

        {/* Header */}
        <section className="mt-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176B5F]">
                Weekly check-in
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#263331]">
                Voice check-in
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687470]">
                Review this check-in, record a voice
                response, and view the processing results.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#EAF5EF] px-4 py-2 text-sm font-semibold text-[#315C55]">
              <CheckCircle2 className="h-4 w-4" />
              {formatStatus(status)}
            </div>
          </div>
        </section>

        {/* Check-in information */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-[#E6E3DC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5EF]">
                <CalendarDays className="h-5 w-5 text-[#315C55]" />
              </div>

              <div>
                <p className="text-xs text-[#8A9290]">
                  Scheduled
                </p>

                <p className="mt-1 text-sm font-semibold text-[#263331]">
                  {formatDate(
                    checkIn?.scheduled_for
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6E3DC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5EF]">
                <Clock3 className="h-5 w-5 text-[#315C55]" />
              </div>

              <div>
                <p className="text-xs text-[#8A9290]">
                  Created
                </p>

                <p className="mt-1 text-sm font-semibold text-[#263331]">
                  {formatDate(
                    checkIn?.created_at
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6E3DC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5EF]">
                <User className="h-5 w-5 text-[#315C55]" />
              </div>

              <div>
                <p className="text-xs text-[#8A9290]">
                  Elder
                </p>

                <p className="mt-1 text-sm font-semibold text-[#263331]">
                  Family member
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6E3DC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5EF]">
                <FileAudio className="h-5 w-5 text-[#315C55]" />
              </div>

              <div>
                <p className="text-xs text-[#8A9290]">
                  Recording
                </p>

                <p className="mt-1 text-sm font-semibold text-[#263331]">
                  {audio
                    ? "Available"
                    : "Not recorded"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Voice recorder */}
        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176B5F]">
              Record in the app
            </p>

            <h2 className="mt-2 text-xl font-semibold text-[#263331]">
              Complete the weekly check-in
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687470]">
              Record your voice directly in the browser.
              Speak naturally for about a minute and take
              your time.
            </p>
          </div>

          {isCompleted ? (
  <div className="rounded-3xl border border-[#DDEBE3] bg-[#EAF5EF] p-6">
    <div className="flex items-start gap-3">
      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#315C55]" />

      <div>
        <h3 className="text-sm font-semibold text-[#263331]">
          This check-in is complete
        </h3>

        <p className="mt-1 text-sm leading-6 text-[#687470]">
          This weekly recording has already been processed.
          You can review the transcript and analysis below.
        </p>
      </div>
    </div>
  </div>
) : (
  <VoiceRecorder
    checkInId={checkinId}
    onComplete={handleVoiceComplete}
  />
)}
        </section>

        {/* Existing audio */}
        <section className="mt-8 rounded-3xl border border-[#E6E3DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176B5F]">
                Existing recording
              </p>

              <h2 className="mt-2 text-xl font-semibold text-[#263331]">
                Audio
              </h2>
            </div>

            {audioLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-[#315C55]" />
            )}
          </div>

          {audio ? (
            <div className="mt-6 space-y-5">

              {audio.original_filename && (
                <div>
                  <p className="text-xs text-[#8A9290]">
                    File
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#263331]">
                    {audio.original_filename}
                  </p>
                </div>
              )}

              {audio.duration_seconds !==
                undefined && (
                <div>
                  <p className="text-xs text-[#8A9290]">
                    Duration
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#263331]">
                    {audio.duration_seconds.toFixed(
                      1
                    )}{" "}
                    seconds
                  </p>
                </div>
              )}
              {transcriptText && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A9290]">
                  Transcript
                </p>

                <div className="mt-2 rounded-2xl bg-[#F8F7F4] p-4">
                  <p className="text-sm leading-7 text-[#263331]">
                    {transcriptText}
                  </p>
                </div>
              </div>
)}
              {audio.storage_path && (
                <div>
                  <p className="text-xs text-[#8A9290]">
                    Storage path
                  </p>

                  <p className="mt-1 break-all text-xs text-[#687470]">
                    {audio.storage_path}
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-[#F8F7F4] p-5">
              <p className="text-sm font-medium text-[#263331]">
                No audio recording yet.
              </p>

              <p className="mt-1 text-sm leading-6 text-[#687470]">
                Use the recorder above to complete this
                check-in.
              </p>
            </div>
          )}
        </section>

        {/* Status information */}
        <section className="mt-8 rounded-3xl border border-[#E6E3DC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#263331]">
            Check-in status
          </h2>

          <div className="mt-5 space-y-4">

            <div className="flex items-center justify-between border-b border-[#EEECE7] pb-4">
              <span className="text-sm text-[#687470]">
                Current status
              </span>

              <span className="rounded-full bg-[#EAF5EF] px-3 py-1 text-xs font-semibold text-[#315C55]">
                {formatStatus(status)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#EEECE7] pb-4">
              <span className="text-sm text-[#687470]">
                Initiated
              </span>

              <span className="text-sm font-medium text-[#263331]">
                {formatDateTime(
                  checkIn?.initiated_at
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-[#687470]">
                Completed
              </span>

              <span className="text-sm font-medium text-[#263331]">
                {formatDateTime(
                  checkIn?.completed_at
                )}
              </span>
            </div>

          </div>
        </section>

        {/* Processing state */}
        {isProcessing && (
          <section className="mt-8 rounded-3xl border border-[#E6E3DC] bg-[#EAF5EF] p-6">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-[#315C55]" />

              <div>
                <h2 className="text-sm font-semibold text-[#263331]">
                  Processing in progress
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#687470]">
                  The recording is being processed. Please
                  refresh this page after a little while.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Completed state */}
        {isCompleted && (
          <section className="mt-8 rounded-3xl border border-[#DDEBE3] bg-[#EAF5EF] p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#315C55]" />

              <div>
                <h2 className="text-sm font-semibold text-[#263331]">
                  Check-in completed
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#687470]">
                  This recording has been processed. You can
                  review the available transcript and analysis
                  on this page.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Safety */}
        <section className="mt-8 border-t border-[#E6E3DC] py-6">
          <p className="mx-auto max-w-3xl text-center text-xs leading-5 text-[#8A9290]">
            Kahaani-Check is not a diagnostic tool. It may
            identify changes in speech that should be discussed
            with a healthcare professional.
          </p>
        </section>

      </div>
    </main>
  );
}