"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import VoiceRecorder from "../components/checkins/VoiceRecorder";
import { apiFetch } from "../lib/api";

export default function VoiceTestPage() {
  const [checkInId, setCheckInId] = useState<string>("771667fa-2cdc-4db9-852c-1e372a550372");
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    async function initCheckIn() {
      try {
        const res = (await apiFetch("/v1/check-ins/current")) as {
          check_in?: { id?: string };
          id?: string;
        };
        const id = res?.check_in?.id || res?.id;
        if (id) {
          setCheckInId(id);
          return;
        }
      } catch {
        // If current check-in lookup failed (e.g. brand new account with 0 elders),
        // automatically create an elder slot and retrieve the new active check-in
        try {
          await apiFetch("/v1/elders", {
            method: "POST",
            body: JSON.stringify({
              display_name: "Family Elder",
              phone_e164: "+919876543210",
              preferred_call_language: "hi",
              dob_year_range: "1945-1950",
              timezone: "Asia/Kolkata",
            }),
          });
          const retryRes = (await apiFetch("/v1/check-ins/current")) as {
            check_in?: { id?: string };
            id?: string;
          };
          const id = retryRes?.check_in?.id || retryRes?.id;
          if (id) {
            setCheckInId(id);
          }
        } catch (innerErr) {
          console.warn("Session init warning:", innerErr);
        }
      }
    }
    initCheckIn();
  }, []);

  return (
    <main className="min-h-screen bg-[#F8F7F4] px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-[#176B5F]">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium text-[#687470]">Connecting voice test session...</p>
          </div>
        ) : checkInId ? (
          <VoiceRecorder
            checkInId={checkInId}
            onComplete={(result) => {
              console.log("Recording completed:", result);
            }}
          />
        ) : (
          <div className="rounded-2xl border border-[#E8DDD4] bg-white p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[#A86A43]" />
            <p className="mt-2 text-sm text-[#7A8582]">{error || "Unable to initialize check-in session."}</p>
          </div>
        )}
      </div>
    </main>
  );
}