"use client";

import VoiceRecorder from "../components/checkins/VoiceRecorder";

export default function VoiceTestPage() {
  return (
    <main className="min-h-screen bg-[#F8F7F4] px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <VoiceRecorder
          checkInId="voice-test"
          onComplete={(result) => {
            console.log("Recording completed:", result);
          }}
        />
      </div>
    </main>
  );
}