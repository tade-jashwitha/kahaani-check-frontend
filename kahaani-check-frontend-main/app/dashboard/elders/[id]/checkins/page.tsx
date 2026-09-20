"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Mic,
  Loader2,
  AlertCircle,
} from "lucide-react";

import PageContainer from "@/app/components/ui/PageContainer";
import PageHeader from "@/app/components/ui/PageHeader";
import StatCard from "@/app/components/ui/StatCard";
import SectionHeader from "@/app/components/ui/SectionHeader";
import CheckinCard, { CheckinCardData } from "@/app/components/ui/CheckinCard";
import EmptyState from "@/app/components/ui/EmptyState";
import Button from "@/app/components/ui/Button";
import { apiFetch } from "@/app/lib/api";

interface BackendElder {
  id: string;
  display_name: string;
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
  has_recording?: boolean;
  recording_id?: string | null;
}

export default function ElderCheckinsPage() {
  const params = useParams();
  const router = useRouter();
  const elderId = String(params.id);

  const [elderName, setElderName] = useState("Family member");
  const [checkins, setCheckins] = useState<CheckinCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [elderResponse, checkinsResponse] = await Promise.all([
          apiFetch(`/v1/elders/${elderId}`),
          apiFetch(`/v1/check-ins/elder/${elderId}`),
        ]);

        const elder = elderResponse as BackendElder;
        setElderName(elder.display_name || "Family member");

        let rawCheckins: BackendCheckin[] = [];
        if (Array.isArray(checkinsResponse)) {
          rawCheckins = checkinsResponse as BackendCheckin[];
        }

        const mapped: CheckinCardData[] = rawCheckins
          .filter((ci) => Boolean(ci.id || ci.check_in_id))
          .map((ci) => {
            const id = (ci.id || ci.check_in_id) as string;
            return {
              id,
              elderId,
              elderName: elder.display_name,
              scheduledAt: ci.scheduled_for || ci.scheduled_at,
              createdAt: ci.created_at,
              completedAt: ci.completed_at,
              status: ci.status || "scheduled",
              hasRecording: Boolean(ci.has_recording || ci.recording_id),
            };
          });

        setCheckins(mapped);
      } catch (err) {
        console.error("Failed to load elder checkins:", err);
        setError(err instanceof Error ? err.message : "Failed to load check-ins.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [elderId]);

  async function handleStartCheckin() {
    try {
      setStarting(true);
      const res = (await apiFetch(`/v1/check-ins/elder/${elderId}/start`, {
        method: "POST",
      })) as { check_in?: { id?: string } };

      const newId = res?.check_in?.id;
      if (newId) {
        router.push(`/dashboard/elders/${elderId}/checkins/${newId}`);
      } else if (checkins.length > 0) {
        router.push(`/dashboard/elders/${elderId}/checkins/${checkins[0].id}`);
      }
    } catch (err) {
      console.error("Failed to start checkin:", err);
      if (checkins.length > 0) {
        router.push(`/dashboard/elders/${elderId}/checkins/${checkins[0].id}`);
      }
    } finally {
      setStarting(false);
    }
  }

  const completedCount = useMemo(
    () => checkins.filter((c) => c.status === "completed").length,
    [checkins]
  );
  const pendingCount = useMemo(
    () => checkins.filter((c) => c.status === "initiated" || c.status === "scheduled").length,
    [checkins]
  );

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#147D72]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* PAGE HEADER */}
      <PageHeader
        title={`${elderName} — Check-ins`}
        subtitle="Review recorded weekly conversations, speech transcripts, and acoustic measures."
        backHref={`/dashboard/elders/${elderId}`}
        backLabel="Elder Profile"
        actions={
          <Button
            variant="primary"
            icon={<Mic size={16} />}
            loading={starting}
            onClick={handleStartCheckin}
          >
            Start Check-in
          </Button>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#F2C5C0] bg-[#FBEAE8] p-4 text-[#C94A4A]">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* 3 STAT CARDS */}
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Completed Sessions"
          value={completedCount}
          subtitle="Processed recordings"
          icon={<CheckCircle2 size={20} />}
        />
        <StatCard
          label="Upcoming / In Progress"
          value={pendingCount}
          subtitle="Scheduled conversations"
          icon={<Clock size={20} />}
        />
        <StatCard
          label="Baseline Progress"
          value={completedCount >= 3 ? "Established" : `${completedCount}/3`}
          subtitle={completedCount >= 3 ? "Full trajectory active" : "Building calibration"}
          icon={<CalendarDays size={20} />}
        />
      </section>

      {/* CHECK-IN LIST */}
      <section>
        <SectionHeader
          title="Conversation History"
          subtitle="All recorded check-in calls and voice sessions"
          className="mb-4"
        />

        {checkins.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={24} />}
            title="No check-ins recorded yet"
            description="Start the first voice check-in to record a natural conversation and begin tracking speech patterns."
            action={
              <Button
                variant="primary"
                icon={<Mic size={15} />}
                onClick={handleStartCheckin}
              >
                Start First Check-in
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {checkins.map((ci) => (
              <CheckinCard key={ci.id} checkin={ci} />
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}