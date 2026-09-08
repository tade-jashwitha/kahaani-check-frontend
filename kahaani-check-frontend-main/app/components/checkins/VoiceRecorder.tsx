"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Square,
  Upload,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";

type VoiceRecorderProps = {
  checkInId: string;
  onComplete?: (result: unknown) => void;
};

type RecorderState =
  | "idle"
  | "recording"
  | "recorded"
  | "uploading"
  | "complete"
  | "error";

export default function VoiceRecorder({
  checkInId,
  onComplete,
}: VoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
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
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const url = URL.createObjectURL(blob);

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

      recorder.start();

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

      const formData = new FormData();

      formData.append(
        "file",
        recordedBlob,
        "kahaani-checkin.webm"
      );

      const response = await apiFetch(
        `/v1/check-ins/${checkInId}/audio`,
        {
          method: "POST",
          body: formData,
        }
      );

      console.log(
        "Audio processing result:",
        response
      );

    
      setState("complete");

      onComplete?.(response);
    } catch (err) {
      console.error("Upload error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload and process the recording."
      );

      setState("error");
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    setAudioUrl(null);
    setRecordedBlob(null);          
    setError("");
    setSeconds(0);

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

  return (
    <div className="w-full max-w-xl rounded-3xl border border-[#E6E3DC] bg-white p-6 shadow-sm">
      <div className="text-center">
        <p className="text-sm font-medium text-[#687470]">
          Weekly voice check-in
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-[#263331]">
          Tell us about your week
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687470]">
          Speak naturally for about a minute.
          Take your time — there are no right
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
          <button
            type="button"
            onClick={startRecording}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#315C55] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#264A45]"
          >
            <Mic className="h-4 w-4" />
            Start speaking
          </button>
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
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#263331]">
                <Play className="h-4 w-4 text-[#315C55]" />
                Recording complete
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

        {isUploading && (
          <div className="mt-6 w-full rounded-2xl bg-[#EAF5EF] p-5 text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#315C55]" />

            <p className="mt-3 text-sm font-semibold text-[#263331]">
              Processing your recording
            </p>

            <p className="mt-1 text-xs leading-5 text-[#687470]">
              Your audio is being transcribed
              and analyzed. This may take a
              little while.
            </p>
          </div>
        )}

        {isComplete && (
          <div className="mt-6 w-full rounded-2xl bg-[#EAF5EF] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#315C55]" />

              <p className="text-sm font-semibold text-[#263331]">
                Check-in completed
              </p>
            </div>

            <p className="mt-2 text-sm leading-6 text-[#687470]">
              Your recording has been processed
              successfully.
            </p>

            <button
              type="button"
              onClick={resetRecording}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#315C55] hover:underline"
            >
              <RotateCcw className="h-4 w-4" />
              Record another check-in
            </button>
          </div>
        )}

    
    {error && (
    <div className="mt-5 w-full rounded-2xl bg-amber-50 p-4">
        <p className="text-center text-sm leading-6 text-amber-800">
        {error}
        </p>
    </div>
    )}


      </div>

      <div className="mt-8 border-t border-[#EEECE7] pt-4 text-center">
        <p className="text-xs leading-5 text-[#8A9290]">
          Kahaani-Check is not a diagnostic tool.
          It may identify changes in speech that
          should be discussed with a healthcare
          professional.
        </p>
      </div>
    </div>
  );
}