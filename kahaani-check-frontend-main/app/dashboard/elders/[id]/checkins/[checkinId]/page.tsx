"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileAudio,
  Loader2,
  RefreshCw,
  User,
  AlertCircle,
  Flag,
  StickyNote,
  Share2,
  Check,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import VoiceRecorder from "@/app/components/checkins/VoiceRecorder";
import PageContainer from "@/app/components/ui/PageContainer";
import PageHeader from "@/app/components/ui/PageHeader";
import Card from "@/app/components/ui/Card";
import Badge from "@/app/components/ui/Badge";
import Button from "@/app/components/ui/Button";
import StatCard from "@/app/components/ui/StatCard";
import SectionHeader from "@/app/components/ui/SectionHeader";
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
  const router = useRouter();

  const elderId = String(params?.id ?? "");
  const checkinId = String(params?.checkinId ?? "");

  // ── Quick actions state ──
  const [flagged, setFlagged] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  function handleFlag() {
    setFlagged((f) => !f);
  }

  function handleSaveNote() {
    localStorage.setItem(`checkin_note_${checkinId}`, noteText);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      });
    }
  }

  // Load saved note from localStorage
  useEffect(() => {
    if (!checkinId) return;
    const saved = localStorage.getItem(`checkin_note_${checkinId}`) ?? "";
    setNoteText(saved);
  }, [checkinId]);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [audio, setAudio] = useState<AudioData | null>(null);
  const [elderName, setElderName] = useState<string>("Family member");

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
      const response = await apiFetch(`/v1/check-ins/${checkinId}`);
      const data = (response as { check_in?: CheckIn })?.check_in || (response as CheckIn);
      setCheckIn(data);
    } catch (err) {
      console.error("Failed to load check-in:", err);
      const apiError = err as ApiError;
      setError(
        apiError?.message || "Unable to load this check-in."
      );
    } finally {
      setLoading(false);
    }
  }, [checkinId]);

  const loadAudio = useCallback(async () => {
    if (!checkinId) {
      return;
    }

    try {
      setAudioLoading(true);
      const response = await apiFetch(`/v1/check-ins/${checkinId}/audio`);
      setAudio(response as AudioData);
    } catch (err) {
      console.error("Failed to load audio:", err);
      setAudio(null);
    } finally {
      setAudioLoading(false);
    }
  }, [checkinId]);

  const loadElder = useCallback(async () => {
    if (!elderId) return;
    try {
      const elder = (await apiFetch(`/v1/elders/${elderId}`)) as { display_name?: string };
      if (elder?.display_name) {
        setElderName(elder.display_name);
      }
    } catch {
      // Ignore if elder fetch fails
    }
  }, [elderId]);

  const loadData = async () => {
    setRefreshing(true);
    await Promise.all([
      loadCheckIn(),
      loadAudio(),
      loadElder(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadCheckIn();
    loadAudio();
    loadElder();
  }, [checkinId, elderId, loadCheckIn, loadAudio, loadElder]);

  const handleVoiceComplete = async (result: unknown | null) => {
    console.log("Voice check-in completed:", result);
    if (result) {
      setAudio(result as AudioData);
    }
    await Promise.all([loadCheckIn(), loadAudio()]);
  };

  const formatDate = (value?: string) => {
    if (!value) return "Not scheduled";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not scheduled";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const status = checkIn?.status ?? "unknown";
  const isCompleted = status === "completed";

  const getStatusBadge = () => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge variant="green">Completed</Badge>;
      case "initiated":
        return <Badge variant="orange">Processing</Badge>;
      case "scheduled":
        return <Badge variant="teal">Scheduled</Badge>;
      case "failed":
        return <Badge variant="red">Failed</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  const transcriptText =
    (typeof audio?.transcript === "string" ? audio.transcript : audio?.transcript?.text) ||
    ((audio?.processing as Record<string, unknown> | undefined)?.transcription as Record<string, unknown> | undefined)?.text as string ||
    ((audio?.processing as Record<string, unknown> | undefined)?.transcript as Record<string, unknown> | undefined)?.text as string ||
    "";

  const recordingObj = (audio?.recording || {}) as Record<string, unknown>;
  const originalFilename =
    audio?.original_filename || (recordingObj?.original_filename as string) || "";
  const durationSeconds =
    audio?.duration_seconds ??
    (recordingObj?.duration_seconds as number | undefined) ??
    ((audio?.processing as Record<string, unknown> | undefined)?.features as Record<string, unknown> | undefined)?.speech_duration_seconds as number | undefined;
  const storagePath =
    audio?.storage_path || (recordingObj?.storage_path as string) || "";

  if (loading) {
    return (
      <PageContainer>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--color-primary)]" />
            <p className="mt-4 text-sm text-[var(--color-text-secondary)] font-medium">
              Loading check-in details...
            </p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error && !checkIn) {
    return (
      <PageContainer>
        <PageHeader
          title="Check-in Details"
          backHref={`/dashboard/elders/${elderId}/checkins`}
          backLabel="Back to check-ins"
        />
        <Card className="p-8 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-badge-orange-bg)] flex items-center justify-center mx-auto mb-4 text-[var(--color-badge-orange-text)]">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Unable to load check-in
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {error}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/elders/${elderId}/checkins`)}
            >
              Back to Check-ins
            </Button>
            <Button variant="primary" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title="Voice Check-in"
        subtitle={`Session details and speech recording for ${elderName}`}
        backHref={`/dashboard/elders/${elderId}/checkins`}
        backLabel={`Back to ${elderName}'s check-ins`}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
            {getStatusBadge()}
          </div>
        }
      />

      {/* Quick Session Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<CalendarDays size={20} />}
          value={formatDate(checkIn?.scheduled_for)}
          label="Scheduled For"
          subtitle="Target date"
        />
        <StatCard
          icon={<Clock3 size={20} />}
          value={formatDate(checkIn?.created_at)}
          label="Created On"
          subtitle="Initial session creation"
        />
        <StatCard
          icon={<User size={20} />}
          value={elderName}
          label="Elder Profile"
          subtitle="Assigned family member"
        />
        <StatCard
          icon={<FileAudio size={20} />}
          value={
            durationSeconds !== undefined
              ? `${Number(durationSeconds).toFixed(1)}s`
              : audio
              ? "Available"
              : "Pending"
          }
          label="Audio Recording"
          subtitle={audio ? "Processed & analyzed" : "Awaiting input"}
        />
      </div>

      {/* Main Content: Recorder & Transcript */}
      <div className="space-y-8">
        {/* Voice Recorder Section */}
        <section>
          <SectionHeader
            title="Complete Voice Check-in"
            subtitle="Record your voice check-in directly in the browser or upload an audio file."
          />

          {isCompleted ? (
            <Card className="p-6 bg-[var(--color-soft-teal)]/40 border-[var(--color-border)]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    This check-in is complete
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    This weekly recording has already been processed with feature extraction and baseline comparison. You can review the session timeline and status below.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex justify-center w-full py-2">
              <VoiceRecorder
                checkInId={checkinId}
                elderId={elderId}
                onComplete={handleVoiceComplete}
              />
            </div>
          )}
        </section>



        {/* Status Breakdown Card */}
        <section>
          <SectionHeader
            title="Session Timeline & Status"
            subtitle="Lifecycle timestamps and system status for this check-in."
          />

          <Card className="p-6">
            <div className="divide-y divide-[var(--color-border)] text-sm">
              <div className="flex items-center justify-between py-3">
                <span className="text-[var(--color-text-secondary)] font-medium">Current Status</span>
                {getStatusBadge()}
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[var(--color-text-secondary)] font-medium">Scheduled Target</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {formatDate(checkIn?.scheduled_for)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[var(--color-text-secondary)] font-medium">Session Initiated</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {formatDateTime(checkIn?.initiated_at || checkIn?.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[var(--color-text-secondary)] font-medium">Session Completed</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {formatDateTime(checkIn?.completed_at || (isCompleted ? checkIn?.updated_at : undefined))}
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* QUICK ACTIONS — inline, no extra menu */}
        <section className="rounded-2xl border border-[#E3E8E5] bg-white p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#6B7D79]">
            Quick Actions
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-flag-recording"
              onClick={handleFlag}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                flagged
                  ? "border-[#EF4444]/40 bg-[#FEE2E2] text-[#DC2626]"
                  : "border-[#E3E8E5] text-[#6B7D79] hover:bg-[#F8F6F0]"
              }`}
            >
              <Flag size={14} />
              {flagged ? "Flagged" : "Flag for Review"}
            </button>

            <button
              type="button"
              id="btn-add-note"
              onClick={() => setNoteOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl border border-[#E3E8E5] px-4 py-2.5 text-xs font-semibold text-[#6B7D79] transition hover:bg-[#F8F6F0]"
            >
              <StickyNote size={14} />
              Add Note
            </button>

            <button
              type="button"
              id="btn-share-checkin"
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl border border-[#E3E8E5] px-4 py-2.5 text-xs font-semibold text-[#6B7D79] transition hover:bg-[#F8F6F0]"
            >
              {shareToast ? <Check size={14} className="text-[#147D72]" /> : <Share2 size={14} />}
              {shareToast ? "Link copied!" : "Share"}
            </button>
          </div>

          {/* Inline note input — shown when Note is tapped */}
          {noteOpen && (
            <div className="mt-4 rounded-xl border border-[#E3E8E5] bg-[#F8F6F0] p-3">
              <textarea
                rows={3}
                placeholder="Add a note about this recording…"
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  setNoteSaved(false);
                }}
                className="w-full resize-none bg-transparent text-xs leading-relaxed text-[#173B38] placeholder-[#8F9E9B] focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    noteSaved
                      ? "bg-[#E8F3F0] text-[#147D72]"
                      : "bg-[#147D72] text-white hover:bg-[#105E57]"
                  }`}
                >
                  {noteSaved ? <Check size={12} /> : null}
                  {noteSaved ? "Saved" : "Save Note"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Safety Disclaimer */}
        <div className="text-center text-xs text-[var(--color-text-secondary)] pt-4 pb-8 border-t border-[var(--color-border)]">
          Kahaani-Check is not a diagnostic tool. Speech markers and trends should be discussed with a qualified healthcare professional.
        </div>
      </div>
    </PageContainer>
  );
}