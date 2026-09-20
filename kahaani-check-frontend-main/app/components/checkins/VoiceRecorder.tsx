"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Square,
  Upload,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";

type VoiceRecorderProps = {
  checkInId: string;
  elderId?: string;
  onComplete?: (result: unknown) => void;
  className?: string;
};

type RecorderState =
  | "idle"
  | "recording"
  | "recorded"
  | "uploading"
  | "complete"
  | "error";

type PipelineStep =
  | "uploading"
  | "received"
  | "processing"
  | "transcribing"
  | "features"
  | "completed"
  | "failed";

interface AudioProcessingResult {
  success?: boolean;
  status?: string;
  checkin_id?: string;
  transcript?: string | { text?: string; language?: string; model_name?: string };
  raw_transcript?: string;
  cleaned_transcript?: string;
  transcription_status?: string;
  quality_flags?: string[];
  transcript_data?: {
    text?: string;
    raw_transcript?: string;
    cleaned_transcript?: string;
    language?: string;
    model_name?: string;
    transcription_status?: string;
    quality_flags?: string[];
  };
  language?: string;
  duration?: number;
  error?: string;
  processing?: {
    status?: string;
    transcription?: {
      text?: string;
      raw_transcript?: string;
      cleaned_transcript?: string;
      language?: string;
      duration?: number;
      transcription_status?: string;
      quality_flags?: string[];
    };
    quality?: {
      passed?: boolean;
      reason?: string;
      duration_seconds?: number;
      snr_db?: number;
    };
    features?: Record<string, unknown>;
  };
  analysis?: Record<string, unknown>;
}

export default function VoiceRecorder({
  checkInId,
  elderId,
  onComplete,
  className = "",
}: VoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stepIntervalRef = useRef<NodeJS.Timeout[]>([]);

  const [state, setState] = useState<RecorderState>("idle");
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("uploading");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>("kahaani-checkin.webm");
  const [result, setResult] = useState<AudioProcessingResult | null>(null);
  const [error, setError] = useState("");

  const clearStepIntervals = () => {
    stepIntervalRef.current.forEach(clearTimeout);
    stepIntervalRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearStepIntervals();
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (state !== "recording") {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds((previous) => previous + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [state]);

  const startRecording = async () => {
    try {
      setError("");
      setRecordedBlob(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Your browser does not support microphone recording."
        );
        setState("error");
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current = stream;
      chunksRef.current = [];

      let mimeType = "";

      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
      ) {
        mimeType = "audio/webm;codecs=opus";
      } else if (
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        mimeType = "audio/webm";
      } else if (
        MediaRecorder.isTypeSupported("audio/mp4")
      ) {
        mimeType = "audio/mp4";
      } else if (
        MediaRecorder.isTypeSupported("audio/ogg")
      ) {
        mimeType = "audio/ogg";
      } else if (
        MediaRecorder.isTypeSupported("audio/wav")
      ) {
        mimeType = "audio/wav";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, {
          type: finalMimeType,
        });

        const url = URL.createObjectURL(blob);
        const ext = finalMimeType.includes("mp4")
          ? "m4a"
          : finalMimeType.includes("ogg")
          ? "ogg"
          : finalMimeType.includes("wav")
          ? "wav"
          : "webm";

        setFileName(`kahaani-checkin.${ext}`);
        setRecordedBlob(blob);
        setAudioUrl(url);
        setState("recorded");

        stream.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      recorder.onerror = () => {
        setError(
          "Something went wrong while recording. Please try again."
        );

        setState("error");

        stream.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      recorder.start(1000);

      setSeconds(0);
      setState("recording");
    } catch (err) {
      console.error("Recording error:", err);

      setError(
        "Microphone access was denied or unavailable. Please allow microphone access and try again."
      );

      setState("error");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(file);
    setRecordedBlob(file);
    setAudioUrl(url);
    setFileName(file.name);
    setState("recorded");
    setError("");
  };

  const uploadRecording = async () => {
    if (!recordedBlob) {
      setError("No recording is available.");
      setState("error");
      return;
    }

    if (!checkInId) {
      setError("Check-in ID is missing.");
      setState("error");
      return;
    }

    try {
      setError("");
      setState("uploading");
      setPipelineStep("uploading");
      clearStepIntervals();

      // Progressive visual feedback matching expected stages
      stepIntervalRef.current.push(
        setTimeout(() => setPipelineStep("received"), 700),
        setTimeout(() => setPipelineStep("processing"), 1600),
        setTimeout(() => setPipelineStep("transcribing"), 2600),
        setTimeout(() => setPipelineStep("features"), 4200)
      );

      const formData = new FormData();
      formData.append(
        "file",
        recordedBlob,
        fileName || "kahaani-checkin.webm"
      );

      const response = (await apiFetch(
        `/v1/check-ins/${checkInId}/audio`,
        {
          method: "POST",
          body: formData,
        }
      )) as AudioProcessingResult;

      clearStepIntervals();
      console.log("Audio processing result:", response);

      if (response && response.success === false) {
        const errorMsg =
          response.error ||
          response.processing?.quality?.reason ||
          "Transcription failed. Please try again.";
        setError(errorMsg);
        setPipelineStep("failed");
        setState("error");
        return;
      }

      setPipelineStep("completed");
      setResult(response);
      setState("complete");

      onComplete?.(response);
    } catch (err) {
      clearStepIntervals();
      console.error("Upload error:", err);
      setPipelineStep("failed");
      setError(
        err instanceof Error
          ? err.message
          : "Transcription failed. Please ensure clear speech and try again."
      );
      setState("error");
    }
  };

  const resetRecording = () => {
    clearStepIntervals();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setAudioUrl(null);
    setRecordedBlob(null);
    setFileName("kahaani-checkin.webm");
    setResult(null);
    setError("");
    setSeconds(0);
    setPipelineStep("uploading");

    chunksRef.current = [];
    mediaRecorderRef.current = null;
    streamRef.current = null;

    setState("idle");
  };

  const formatTime = (value: number) => {
    const minutes = Math.floor(value / 60);
    const remainingSeconds = value % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  };

  const isRecording = state === "recording";
  const isUploading = state === "uploading";
  const isComplete = state === "complete";

  // Extract transcript text
  const rawTranscript =
    (typeof result?.transcript === "string" ? result.transcript : result?.transcript?.text) ||
    result?.transcript_data?.text ||
    result?.processing?.transcription?.text ||
    "";

  // Extract metadata
  const detectedLangCode =
    result?.language ||
    result?.transcript_data?.language ||
    (typeof result?.transcript === "object" ? result.transcript?.language : undefined) ||
    result?.processing?.transcription?.language ||
    "";

  const displayLanguage =
    detectedLangCode.toLowerCase() === "hi"
      ? "Hindi"
      : detectedLangCode.toLowerCase() === "en"
      ? "English"
      : detectedLangCode || "Hindi / English";

  const displayDuration =
    result?.duration !== undefined
      ? Number(result.duration).toFixed(1)
      : result?.processing?.quality?.duration_seconds !== undefined
      ? Number(result.processing.quality.duration_seconds).toFixed(1)
      : undefined;

  // Extract quality status & flags
  const transcriptionStatus =
    result?.transcription_status ||
    result?.transcript_data?.transcription_status ||
    result?.processing?.transcription?.transcription_status ||
    "ok";

  const qualityFlags: string[] =
    result?.quality_flags ||
    result?.transcript_data?.quality_flags ||
    result?.processing?.transcription?.quality_flags ||
    [];

  const hasQualityWarning = transcriptionStatus === "quality_warning" || qualityFlags.length > 0;

  // Pipeline step messages
  const stepLabels: Record<PipelineStep, string> = {
    uploading: "Uploading...",
    received: "Audio received",
    processing: "Processing audio...",
    transcribing: "Transcribing...",
    features: "Extracting speech features...",
    completed: "Completed",
    failed: "Transcription failed",
  };

  return (
    <div className={`mx-auto w-full max-w-xl rounded-3xl border border-[#E6E3DC] bg-white p-6 shadow-sm ${className}`}>
      <div className="text-center">
        <p className="text-sm font-medium text-[#687470]">
          Weekly voice check-in
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-[#263331]">
          Tell us about your week
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687470]">
          Speak naturally for about a minute. Take your time — there are no right
          or wrong answers.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-full transition-all ${
            isRecording
              ? "bg-[#EAF2EE] ring-8 ring-[#EAF2EE]/60"
              : "bg-[#EAF5EF]"
          }`}
        >
          {isComplete ? (
            <CheckCircle2 className="h-10 w-10 text-[#315C55]" />
          ) : (
            <Mic className="h-9 w-9 text-[#315C55]" />
          )}
        </div>

        <div className="mt-5 text-3xl font-semibold tracking-wide text-[#263331]">
          {formatTime(seconds)}
        </div>

        {state === "idle" && (
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-2 rounded-full bg-[#315C55] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#264A45]"
            >
              <Mic className="h-4 w-4" />
              Start speaking
            </button>

            <span className="text-xs font-medium text-[#8A9290]">or</span>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-[#DCE8E2] bg-[#EEF4F2] px-6 py-3 text-sm font-semibold text-[#176B5F] shadow-sm transition hover:bg-[#E2ECE7]"
            >
              <Upload className="h-4 w-4" />
              Upload audio file
            </button>
          </div>
        )}

        {isRecording && (
          <div className="flex flex-col items-center">
            <p className="mt-5 text-sm font-medium text-[#315C55]">
              Recording…
            </p>

            <button
              type="button"
              onClick={stopRecording}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#315C55] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#264A45]"
            >
              <Square className="h-4 w-4 fill-current" />
              Stop recording
            </button>
          </div>
        )}

        {state === "recorded" && audioUrl && (
          <div className="mt-6 w-full">
            <div className="rounded-2xl bg-[#F8F7F4] p-4">
              <div className="mb-3 flex items-center justify-between gap-2 text-sm font-medium text-[#263331]">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-[#315C55]" />
                  Audio ready for analysis
                </div>
                <span className="max-w-[200px] truncate text-xs text-[#7A8582]">
                  {fileName}
                </span>
              </div>

              <audio
                controls
                src={audioUrl}
                className="w-full"
              />
            </div>

            <button
              type="button"
              onClick={uploadRecording}
              className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[#315C55] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#264A45]"
            >
              <Upload className="h-4 w-4" />
              Upload & analyze
            </button>

            <button
              type="button"
              onClick={resetRecording}
              className="mx-auto mt-4 flex items-center gap-2 text-sm font-medium text-[#687470] hover:text-[#315C55]"
            >
              <RotateCcw className="h-4 w-4" />
              Record again
            </button>
          </div>
        )}

        {/* Multi-stage uploading progress indicator */}
        {isUploading && (
          <div className="mt-6 w-full rounded-2xl bg-[#EAF5EF] p-5 text-center border border-[#D5E8DD]">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#315C55]" />

            <p className="mt-3 text-sm font-semibold text-[#263331]">
              {stepLabels[pipelineStep]}
            </p>

            {/* Pipeline progress breadcrumbs */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#687470]">
              <span className={pipelineStep === "uploading" ? "font-semibold text-[#315C55]" : ""}>
                Upload
              </span>
              <span>→</span>
              <span className={pipelineStep === "received" || pipelineStep === "processing" ? "font-semibold text-[#315C55]" : ""}>
                Audio
              </span>
              <span>→</span>
              <span className={pipelineStep === "transcribing" ? "font-semibold text-[#315C55]" : ""}>
                Transcribing
              </span>
              <span>→</span>
              <span className={pipelineStep === "features" ? "font-semibold text-[#315C55]" : ""}>
                Features
              </span>
            </div>
          </div>
        )}

        {/* Completed state with Real Transcript Display */}
        {isComplete && (
          <div className="mt-6 w-full rounded-2xl bg-[#EAF5EF] p-5 border border-[#D5E8DD]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#315C55]" />
                <p className="text-sm font-semibold text-[#263331]">
                  Check-in evaluated
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-[#315C55]/10 px-2.5 py-0.5 text-xs font-medium text-[#315C55]">
                Completed
              </span>
            </div>



            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#315C55]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Acoustic speech biomarkers extracted and saved.</span>
            </div>

            {/* In-app Completion Notification Banner */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-[#147D72] p-3.5 text-white shadow-sm text-left">
              <div className="flex items-center gap-2 text-xs">
                <Sparkles className="h-4 w-4 shrink-0 text-[#C8DFD9]" />
                <span>Voice check-in recorded! New caregiver insights are ready.</span>
              </div>
              <Link
                href={elderId ? `/dashboard/insights?elder=${elderId}` : "/dashboard/insights"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#147D72] hover:bg-[#E8F3F0] transition shrink-0"
              >
                <span>View Summary</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <button
              type="button"
              onClick={resetRecording}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#315C55] hover:underline"
            >
              <RotateCcw className="h-4 w-4" />
              Upload or record another
            </button>
          </div>
        )}

        {/* Transcription Failed / Error state */}
        {state === "error" && (
          <div className="mt-5 w-full rounded-2xl bg-amber-50 p-4 border border-amber-200 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  Transcription failed
                </p>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  {error || "Unable to transcribe audio. Please verify your microphone and speak clearly."}
                </p>
                <button
                  type="button"
                  onClick={resetRecording}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-800 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-900 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-[#EEECE7] pt-4 text-center">
        <p className="text-xs leading-5 text-[#8A9290]">
          Kahaani-Check is not a diagnostic tool. It may identify changes in speech that
          should be discussed with a healthcare professional.
        </p>
      </div>
    </div>
  );
}