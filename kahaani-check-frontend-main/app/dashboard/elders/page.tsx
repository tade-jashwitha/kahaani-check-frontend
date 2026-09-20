"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Loader2,
} from "lucide-react";

import PageContainer from "@/app/components/ui/PageContainer";
import PageHeader from "@/app/components/ui/PageHeader";
import ElderCard, { ElderCardData } from "@/app/components/ui/ElderCard";
import EmptyState from "@/app/components/ui/EmptyState";
import Button from "@/app/components/ui/Button";
import { useElders } from "@/app/features/elders/hooks";
import { startCheckin } from "@/app/features/checkins/api";

export default function EldersPage() {
  const router = useRouter();
  const { elders: rawElders, loading } = useElders();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [startingCheckin, setStartingCheckin] = useState(false);

  const elders: ElderCardData[] = useMemo(() => {
    return rawElders.map((e) => ({
      id: e.id,
      display_name: e.display_name,
      phone_e164: e.phone_e164,
      preferred_call_language: e.preferred_call_language,
      dob_year_range: e.dob_year_range,
      status: e.status || "active",
      baselineReady: true,
      baselineProgress: 3,
    }));
  }, [rawElders]);

  const filteredElders = useMemo(() => {
    return elders.filter((elder) => {
      const matchesSearch =
        elder.display_name.toLowerCase().includes(search.toLowerCase()) ||
        elder.phone_e164.includes(search);
      const matchesFilter = filter === "all" || elder.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [elders, search, filter]);

  async function handleStartCheckin(elderId: string) {
    try {
      setStartingCheckin(true);
      const res = await startCheckin(elderId);
      const checkInId = res?.check_in?.id;
      if (checkInId) {
        router.push(`/dashboard/elders/${elderId}/checkins/${checkInId}`);
      } else {
        router.push(`/dashboard/elders/${elderId}/checkins`);
      }
    } catch (err) {
      console.error("Failed to start checkin:", err);
      router.push(`/dashboard/elders/${elderId}/checkins`);
    } finally {
      setStartingCheckin(false);
    }
  }

  return (
    <PageContainer>
      {/* HEADER */}
      <PageHeader
        title="Family Elders"
        subtitle="Manage family profiles, consent records, and weekly check-in schedules."
        actions={
          <Link href="/dashboard/elders/new">
            <Button variant="primary" icon={<Plus size={16} />}>
              Add Elder
            </Button>
          </Link>
        }
      />

      {/* SEARCH AND FILTERS */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E9B]"
          />
          <input
            type="text"
            placeholder="Search by elder name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#E3E8E5] bg-white py-2.5 pl-10 pr-4 text-sm text-[#173B38] placeholder-[#8F9E9B] shadow-sm transition focus:border-[#147D72] focus:outline-none focus:ring-1 focus:ring-[#147D72]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filter === "all"
                ? "bg-[#147D72] text-white"
                : "border border-[#E3E8E5] bg-white text-[#6B7D79] hover:bg-[#F8F6F0]"
            }`}
          >
            All Elders ({elders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filter === "active"
                ? "bg-[#147D72] text-white"
                : "border border-[#E3E8E5] bg-white text-[#6B7D79] hover:bg-[#F8F6F0]"
            }`}
          >
            Active
          </button>
        </div>
      </div>

      {/* ELDERS LIST (2-COLUMN GRID) */}
      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-[#E3E8E5] bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-[#147D72]" />
        </div>
      ) : filteredElders.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title={search ? "No elders found" : "No family elders registered"}
          description={
            search
              ? `No results matching "${search}". Try searching for a different name or phone number.`
              : "Add your first elder to begin recording weekly check-ins and tracking subtle speech trends."
          }
          action={
            !search ? (
              <Link href="/dashboard/elders/new">
                <Button variant="primary" icon={<Plus size={15} />}>
                  Add Family Member
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredElders.map((elder) => (
            <ElderCard
              key={elder.id}
              elder={elder}
              onStartCheckin={handleStartCheckin}
              startingCheckin={startingCheckin}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}