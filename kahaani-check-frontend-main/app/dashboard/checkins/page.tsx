"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Mic,
  Loader2,
  Users,
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

export default function CheckinsPage() {
  const router = useRouter();
  const [elders, setElders] = useState<BackendElder[]>([]);
  const [checkins, setCheckins] = useState<CheckinCardData[]>([]);
  const [selectedElderId, setSelectedElderId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [startingCheckin, setStartingCheckin] = useState(false);

  useEffect(() => {
    async function loadAllCheckins() {
      try {
        setLoading(true);
        const eldersData = await apiFetch("/v1/elders");
        const eldersList = (Array.isArray(eldersData) ? eldersData : (eldersData as { elders?: BackendElder[] })?.elders || []) as BackendElder[];
        setElders(eldersList);

        const allCheckins: CheckinCardData[] = [];

        for (const elder of eldersList) {
          try {
            const checkinsRes = await apiFetch(`/v1/check-ins/elder/${elder.id}`);
            if (Array.isArray(checkinsRes)) {
              for (const ci of checkinsRes as BackendCheckin[]) {
                const id = ci.id || ci.check_in_id;
                if (!id) continue;
                allCheckins.push({
                  id,
                  elderId: elder.id,
                  elderName: elder.display_name,
                  scheduledAt: ci.scheduled_for || ci.scheduled_at,
                  createdAt: ci.created_at,
                  completedAt: ci.completed_at,
                  status: ci.status || "scheduled",
                  hasRecording: Boolean(ci.has_recording || ci.recording_id),
                });
              }
            }
          } catch {
            // Elder checkins failed, continue
          }
        }

        setCheckins(allCheckins);
      } catch (err) {
        console.error("Failed to load checkins:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAllCheckins();
  }, []);

  const filteredCheckins = useMemo(() => {
    if (selectedElderId === "all") return checkins;
    return checkins.filter((c) => c.elderId === selectedElderId);
  }, [checkins, selectedElderId]);

  const completedCount = useMemo(
    () => checkins.filter((c) => c.status === "completed").length,
    [checkins]
  );
  const inProgressCount = useMemo(
    () => checkins.filter((c) => c.status === "initiated" || c.status === "scheduled").length,
    [checkins]
  );

  async function handleStartCheckin() {
    const targetElderId = selectedElderId !== "all" ? selectedElderId : elders[0]?.id;
    if (!targetElderId) {
      router.push("/dashboard/elders/new");
      return;
    }

    try {
      setStartingCheckin(true);
      const res = (await apiFetch(`/v1/check-ins/elder/${targetElderId}/start`, {
        method: "POST",
      })) as { check_in?: { id?: string } };

      const checkInId = res?.check_in?.id;
      if (checkInId) {
        router.push(`/dashboard/elders/${targetElderId}/checkins/${checkInId}`);
      } else {
        router.push(`/dashboard/elders/${targetElderId}/checkins`);
      }
    } catch (err) {
      console.error("Failed to start checkin:", err);
      router.push(`/dashboard/elders/${targetElderId}/checkins`);
    } finally {
      setStartingCheckin(false);
    }
  }

  return (
    <PageContainer>
      {/* PAGE HEADER */}
      <PageHeader
        title="Voice Check-ins"
        subtitle="Manage scheduled calls, record spontaneous check-ins, and inspect transcription text."
        actions={
          <Button
            variant="primary"
            icon={<Mic size={16} />}
            loading={startingCheckin}
            onClick={handleStartCheckin}
          >
            Start Voice Check-in
          </Button>
        }
      />

      {/* 3 COMPACT STAT CARDS */}
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Completed Check-ins"
          value={completedCount}
          subtitle="Processed speech samples"
          icon={<CheckCircle2 size={20} />}
        />
        <StatCard
          label="In Progress / Scheduled"
          value={inProgressCount}
          subtitle="Upcoming conversations"
          icon={<Clock size={20} />}
        />
        <StatCard
          label="Elders Monitored"
          value={elders.length}
          subtitle="Active baseline calibrations"
          icon={<Users size={20} />}
        />
      </section>

      {/* FILTER TABS */}
      {elders.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedElderId("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              selectedElderId === "all"
                ? "bg-[#147D72] text-white"
                : "border border-[#E3E8E5] bg-white text-[#6B7D79] hover:bg-[#F8F6F0]"
            }`}
          >
            All Elders ({checkins.length})
          </button>
          {elders.map((elder) => (
            <button
              key={elder.id}
              type="button"
              onClick={() => setSelectedElderId(elder.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                selectedElderId === elder.id
                  ? "bg-[#147D72] text-white"
                  : "border border-[#E3E8E5] bg-white text-[#6B7D79] hover:bg-[#F8F6F0]"
              }`}
            >
              {elder.display_name}
            </button>
          ))}
        </div>
      )}

      {/* CHECK-INS LIST */}
      <section>
        <SectionHeader
          title="All Check-in Sessions"
          subtitle="Chronological check-in history across family elders"
          className="mb-4"
        />

        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-[#E3E8E5] bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-[#147D72]" />
          </div>
        ) : filteredCheckins.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={24} />}
            title="No voice check-ins recorded yet"
            description="Recording the first 3 weekly conversations establishes a personalized speech baseline. Click 'Start Voice Check-in' to begin."
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
            {filteredCheckins.map((ci) => (
              <CheckinCard key={ci.id} checkin={ci} />
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
