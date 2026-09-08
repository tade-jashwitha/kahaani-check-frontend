"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home,
  Users,
  ClipboardCheck,
  Lightbulb,
  Settings,
  Plus,
  ArrowRight,
  Heart,
  TrendingUp,
  CalendarDays,
  Clock3,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";

// =========================================================
// TYPES
// =========================================================

type ElderStatus = "stable" | "review" | "insufficient";

interface Elder {
  id: string | number;
  name: string;
  age: number;
  relationship: string;
  phone: string;
  status: ElderStatus;
  lastCheckIn: string;
  checkInDay: string;
  checkInTime: string;
  notes: string;
}

interface BackendElder {
  id: string;
  display_name?: string;
  phone_e164?: string;
  preferred_call_language?: string;
  dob_year_range?: string | null;
  status?: string;
}

// =========================================================
// DASHBOARD
// =========================================================

export default function DashboardPage() {
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const data = await apiFetch("/v1/elders");
        if (Array.isArray(data)) {
          const mapped: Elder[] = (data as BackendElder[]).map((item) => {
            let age = 75;
            if (item.dob_year_range && typeof item.dob_year_range === "string") {
              const startYear = parseInt(item.dob_year_range.split("-")[0], 10);
              if (!isNaN(startYear)) {
                age = new Date().getFullYear() - startYear;
              }
            }
            return {
              id: item.id,
              name: item.display_name || "Family Member",
              age,
              relationship: "Elder",
              phone: item.phone_e164 || "",
              status: (item.status === "review" ? "review" : "stable") as ElderStatus,
              lastCheckIn: "Weekly Check-in",
              checkInDay: "Weekly",
              checkInTime: "10:00 AM",
              notes: `Language: ${item.preferred_call_language || "hi"}`,
            };
          });
          setElders(mapped);
        }
      } catch {
        // Failed to load elders
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // =======================================================
  // COUNTS
  // =======================================================

  const stableCount = elders.filter(
    (elder) => elder.status === "stable"
  ).length;

  const reviewCount = elders.filter(
    (elder) => elder.status === "review"
  ).length;

  // =======================================================
  // MAIN
  // =======================================================

  return (
    <main
  className="relative min-h-screen overflow-hidden text-[#263331]"
  style={{
    background:
      "radial-gradient(circle at 15% 0%, #DCEDE5 0%, transparent 45%), radial-gradient(circle at 100% 15%, #F4D8C6 0%, transparent 40%), #FBF7EE",
  }}
>

      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-[#E7E3D9] bg-[#FFFDF8] lg:block">

        {/* LOGO */}

        <div className="flex items-center gap-3 px-7 py-7">

          <div className="relative h-9 w-9">

            <span className="absolute left-1 top-2 h-5 w-3 rotate-[-35deg] rounded-full bg-[#176B5F]" />

            <span className="absolute left-4 top-1 h-5 w-3 rotate-[35deg] rounded-full bg-[#176B5F]" />

            <span className="absolute left-2 top-5 h-4 w-3 rotate-[-20deg] rounded-full bg-[#E99B68]" />

          </div>

          <div>

            <p className="font-semibold text-[#24584F]">
              Kahaani-Check
            </p>

            <p className="text-[10px] text-[#87918D]">
              Because every story matters
            </p>

          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="space-y-1 px-4">

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl bg-[#EAF2EE] px-4 py-3 text-sm font-semibold text-[#176B5F]"
          >
            <Home size={18} />
            Home
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <Users size={18} />
            Elders
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <ClipboardCheck size={18} />
            Check-ins
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <Lightbulb size={18} />
            Insights
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <Settings size={18} />
            Settings
          </Link>

        </nav>

        {/* SIDEBAR FOOTER */}

        <div className="absolute bottom-7 left-5 right-5 rounded-2xl bg-[#EEF4F2] p-4">

          <div className="flex items-start gap-3">

            <Heart
              size={17}
              className="mt-0.5 shrink-0 text-[#176B5F]"
            />

            <div>

              <p className="text-xs font-semibold text-[#24584F]">
                Every conversation matters
              </p>

              <p className="mt-1 text-[10px] leading-4 text-[#7A8582]">
                Stay connected with the people you love.
              </p>

            </div>

          </div>

        </div>

      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="lg:pl-64">

        <div className="mx-auto max-w-6xl px-5 py-6 pb-32 sm:px-8 lg:px-12 lg:py-10 lg:pb-12">

          {/* =================================================
              HEADER
          ================================================= */}

          <header>

            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#176B5F]">
              My family
            </p>

            <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Good morning
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#7A8582]">
                  Stay connected with your loved ones and keep track of the
                  conversations that matter.
                </p>

              </div>

              <Link
                href="/dashboard/elders/new"
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#176B5F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12584F]"
              >
                <Plus size={17} />
                Add an elder
              </Link>

            </div>

          </header>

          {/* =================================================
              WELCOME CARD
          ================================================= */}

          <section className="relative mt-7 overflow-hidden rounded-3xl border border-[#DCE8E2] bg-[#EEF4F2] p-6 sm:p-7">

            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/50 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-[#F8E7D8]/50 blur-3xl" />

            <div className="relative flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#176B5F] shadow-sm">
                <Heart size={21} />
              </div>

              <div>

                <h2 className="text-lg font-semibold text-[#24584F]">
                  A little check-in goes a long way.
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53615D]">
                  Kahaani-Check helps you notice conversation patterns over
                  time, so you can stay close to the people who matter most.
                </p>

              </div>

            </div>

          </section>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <section className="mt-7">

            <div className="grid gap-4 sm:grid-cols-3">

              {/* FAMILY */}

              <div className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#176B5F]">
                    <Users size={19} />
                  </div>

                  <div>

                    <p className="text-xs text-[#8A9290]">
                      Family members
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {elders.length}
                    </p>

                  </div>

                </div>

              </div>

              {/* STABLE */}

              <div className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#176B5F]">
                    <TrendingUp size={19} />
                  </div>

                  <div>

                    <p className="text-xs text-[#8A9290]">
                      Stable
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {stableCount}
                    </p>

                  </div>

                </div>

              </div>

              {/* REVIEW */}

              <div className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8E7D8] text-[#A86A43]">
                    <ClipboardCheck size={19} />
                  </div>

                  <div>

                    <p className="text-xs text-[#8A9290]">
                      Needs review
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {reviewCount}
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              FAMILY SECTION
          ================================================= */}

          <section className="mt-8">

            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#176B5F]">
                  Your loved ones
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  Family overview
                </h2>

              </div>

              <Link
                href="/dashboard/elders"
                className="hidden items-center gap-1 text-xs font-semibold text-[#176B5F] sm:inline-flex"
              >
                View all
                <ArrowRight size={14} />
              </Link>

            </div>

            {/* EMPTY STATE */}

            {!loading && elders.length === 0 && (

              <div className="mt-4 rounded-3xl border border-dashed border-[#D9D5CC] bg-[#FFFDF8] p-8 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF2EE] text-[#176B5F]">
                  <Users size={24} />
                </div>

                <h3 className="mt-4 text-base font-semibold">
                  Add your first family member
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7A8582]">
                  Start by adding an elder so you can schedule check-ins and
                  understand their conversation patterns over time.
                </p>

                <Link
                  href="/dashboard/elders/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#176B5F] px-5 py-3 text-sm font-semibold text-white"
                >
                  <Plus size={17} />
                  Add an elder
                </Link>

              </div>

            )}

            {/* ELDER CARDS */}

            {elders.length > 0 && (

              <div className="mt-4 grid gap-4 md:grid-cols-2">

                {elders.slice(0, 4).map((elder) => (

                  <Link
                    key={elder.id}
                    href={`/dashboard/elders/${elder.id}`}
                    className="group rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-center gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DDEFE8] font-semibold text-[#176B5F]">
                          {elder.name
                            .split(" ")
                            .map((word) => word[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">

                          <h3 className="truncate text-sm font-semibold">
                            {elder.name}
                          </h3>

                          <p className="mt-1 text-xs text-[#8A9290]">
                            {elder.relationship} • Age {elder.age}
                          </p>

                        </div>

                      </div>

                      {/* STATUS */}

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          elder.status === "stable"
                            ? "bg-[#EAF2EE] text-[#176B5F]"
                            : elder.status === "review"
                            ? "bg-[#F8E7D8] text-[#A86A43]"
                            : "bg-[#F6E4E1] text-[#A14D45]"
                        }`}
                      >
                        {elder.status === "stable"
                          ? "Stable"
                          : elder.status === "review"
                          ? "Review"
                          : "At risk"}
                      </span>

                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <div className="rounded-xl bg-[#F7F4EC] p-3">

                        <div className="flex items-center gap-2">

                          <CalendarDays
                            size={14}
                            className="text-[#176B5F]"
                          />

                          <p className="text-[10px] text-[#8A9290]">
                            Last check-in
                          </p>

                        </div>

                        <p className="mt-1 text-xs font-medium">
                          {elder.lastCheckIn || "Not yet"}
                        </p>

                      </div>

                      <div className="rounded-xl bg-[#F7F4EC] p-3">

                        <div className="flex items-center gap-2">

                          <Clock3
                            size={14}
                            className="text-[#A86A43]"
                          />

                          <p className="text-[10px] text-[#8A9290]">
                            Next check-in
                          </p>

                        </div>

                        <p className="mt-1 text-xs font-medium">
                          {elder.checkInDay} • {elder.checkInTime}
                        </p>

                      </div>

                    </div>

                    <div className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-[#176B5F] opacity-0 transition group-hover:opacity-100">
                      View profile
                      <ArrowRight size={14} />
                    </div>

                  </Link>

                ))}

              </div>

            )}

            {/* VIEW ALL MOBILE */}

            {elders.length > 0 && (

              <Link
                href="/dashboard/elders"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#E1DDD3] bg-[#FFFDF8] py-3 text-xs font-semibold text-[#176B5F] sm:hidden"
              >
                View all family members
                <ArrowRight size={14} />
              </Link>

            )}

          </section>

          {/* =================================================
              UPCOMING CHECK-IN
          ================================================= */}

          {elders.length > 0 && (

            <section className="mt-8 rounded-3xl border border-[#E7E3D9] bg-[#FFFDF8] p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8E7D8] text-[#A86A43]">
                  <CalendarDays size={19} />
                </div>

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A86A43]">
                    Upcoming
                  </p>

                  <h2 className="mt-1 text-base font-semibold">
                    Next family check-in
                  </h2>

                </div>

              </div>

              <div className="mt-5 rounded-2xl bg-[#F7F4EC] p-4">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-sm font-semibold">
                      {elders[0].name}
                    </p>

                    <p className="mt-1 text-xs text-[#7A8582]">
                      {elders[0].checkInDay} at {elders[0].checkInTime}
                    </p>

                  </div>

                  <Link
                    href={`/dashboard/elders/${elders[0].id}/checkins`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176B5F] px-4 py-2.5 text-xs font-semibold text-white"
                  >
                    View check-ins
                    <ArrowRight size={14} />
                  </Link>

                </div>

              </div>

            </section>

          )}

          {/* =================================================
              FOOTER MESSAGE
          ================================================= */}

          <div className="mt-8 text-center">

            <p className="text-xs leading-5 text-[#8A9290]">
              Kahaani-Check helps you notice changes over time while keeping
              your family conversations meaningful.
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          MOBILE BOTTOM NAVIGATION
      ===================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E1D8] bg-[#FFFDF8]/95 px-2 py-2 backdrop-blur lg:hidden">

        <div className="mx-auto grid h-[68px] max-w-[480px] grid-cols-4">

          {/* HOME */}

          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-[#176B5F]"
          >
            <Home size={18} />
            Home
          </Link>

          {/* ELDERS */}

          <Link
            href="/dashboard/elders"
            className="flex flex-col items-center justify-center gap-1 text-[10px] text-[#87918D]"
          >
            <Users size={18} />
            Elders
          </Link>

          {/* CHECK-INS */}

          <Link
            href="/dashboard/elders"
            className="flex flex-col items-center justify-center gap-1 text-[10px] text-[#87918D]"
          >
            <ClipboardCheck size={18} />
            Check-ins
          </Link>

          {/* INSIGHTS */}

          <Link
            href="/dashboard/elders"
            className="flex flex-col items-center justify-center gap-1 text-[10px] text-[#87918D]"
          >
            <Lightbulb size={18} />
            Insights
          </Link>

        </div>

      </nav>

    </main>
  );
}