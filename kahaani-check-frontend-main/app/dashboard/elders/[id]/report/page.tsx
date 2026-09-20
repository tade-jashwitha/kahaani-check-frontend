"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import DoctorReportView, {
  type DoctorReportElder,
  type DoctorReportBaseline,
  type DoctorReportObservation,
  type DoctorReportCaregiverSummary,
} from "@/app/components/reports/DoctorReportView";
import type { Alert } from "@/app/features/alerts/types";

export default function DoctorReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const elderId = String(params?.id ?? "");

  const [elder, setElder] = useState<DoctorReportElder | null>(null);
  const [trajectory, setTrajectory] = useState<{
    status?: string;
    baseline?: DoctorReportBaseline | null;
    observations?: DoctorReportObservation[];
    caregiver_summary?: DoctorReportCaregiverSummary | null;
  } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [caregiverNotes, setCaregiverNotes] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReportData() {
      if (!elderId) return;
      try {
        setLoading(true);
        setError("");

        const [elderRes, trajRes, alertsRes] = await Promise.allSettled([
          apiFetch(`/v1/elders/${elderId}`),
          apiFetch(`/v1/elders/${elderId}/trajectory`),
          apiFetch("/v1/alerts"),
        ]);

        if (elderRes.status === "fulfilled") {
          setElder(elderRes.value as DoctorReportElder);
        } else {
          throw new Error("Unable to load patient profile.");
        }

        if (trajRes.status === "fulfilled") {
          setTrajectory(trajRes.value as typeof trajectory);
        }

        if (alertsRes.status === "fulfilled") {
          const res = alertsRes.value as { alerts?: Alert[] };
          if (res && Array.isArray(res.alerts)) {
            setAlerts(res.alerts);
          }
        }

        if (typeof window !== "undefined") {
          const savedNotes = localStorage.getItem(`elder_notes_${elderId}`) ?? "";
          setCaregiverNotes(savedNotes);
        }
      } catch (err) {
        console.error("Failed to load doctor report data:", err);
        setError(err instanceof Error ? err.message : "Failed to load clinical report data.");
      } finally {
        setLoading(false);
      }
    }

    loadReportData();
  }, [elderId]);

  // Handle auto-print if triggered via ?download=true or ?print=true
  useEffect(() => {
    if (!loading && elder && (searchParams.get("download") === "true" || searchParams.get("print") === "true")) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, elder, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#147D72]" />
          <p className="mt-3 text-xs font-medium text-[#6B7D79]">Generating 6-page clinical report...</p>
        </div>
      </div>
    );
  }

  if (error || !elder) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <AlertTriangle size={36} className="mx-auto text-[#D97706]" />
        <h2 className="mt-4 text-base font-bold text-[#173B38]">Unable to Generate Doctor Report</h2>
        <p className="mt-1 text-xs text-[#6B7D79]">{error || "Patient record not found."}</p>
        <Link href={`/dashboard/elders/${elderId}`} className="mt-5 inline-block">
          <button type="button" className="rounded-xl bg-[#147D72] px-4 py-2 text-xs font-semibold text-white">
            Return to Elder Profile
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F0] py-6 sm:py-10 print:bg-white print:p-0 print:py-0">
      {/* Top back navigation */}
      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between px-4">
        <Link
          href={`/dashboard/insights?elder=${elderId}`}
          className="flex items-center gap-2 text-xs font-medium text-[#6B7D79] hover:text-[#173B38]"
        >
          <ArrowLeft size={14} />
          Back to Voice & Wellness Insights
        </Link>
        <Link
          href={`/dashboard/elders/${elderId}`}
          className="text-xs text-[#6B7D79] hover:text-[#173B38]"
        >
          Elder Profile
        </Link>
      </div>

      <DoctorReportView
        elder={elder}
        trajectoryStatus={trajectory?.status}
        baseline={trajectory?.baseline}
        observations={trajectory?.observations || []}
        caregiverSummary={trajectory?.caregiver_summary}
        alerts={alerts}
        caregiverNotes={caregiverNotes}
      />
    </div>
  );
}
