"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ArrowLeft,
  Bell,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronRight,
  Home,
  Users,
  CalendarDays,
  Lightbulb,
  Settings,
  Heart,
  Check,
  UserRound,
} from "lucide-react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [privacy, setPrivacy] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  return (
    <main className="min-h-screen bg-[#FBF7EE] text-[#263331]">
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

        {/* SIDEBAR NAVIGATION */}

        <nav className="space-y-1 px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
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
            <CalendarDays size={18} />
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
            className="flex items-center gap-3 rounded-xl bg-[#EAF2EE] px-4 py-3 text-sm font-semibold text-[#176B5F]"
          >
            <Settings size={18} />
            Settings
          </Link>
        </nav>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="lg:pl-64">
        <div className="mx-auto max-w-4xl px-5 py-6 pb-32 sm:px-8 lg:px-12 lg:py-10 lg:pb-12">
          {/* BACK */}

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#687470] transition hover:text-[#176B5F]"
          >
            <ArrowLeft size={17} />
            Back to Home
          </Link>

          {/* =================================================
              HEADER
          ================================================= */}

          <section className="mt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2EE] text-[#176B5F]">
                <Settings size={21} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#176B5F]">
                  Preferences
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Settings
                </h1>

                <p className="mt-1 text-sm text-[#7A8582]">
                  Manage your account, notifications, and privacy.
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              ACCOUNT
          ================================================= */}

          <section className="mt-8">
            <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8A9290]">
              Account
            </h2>

            <div className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EEF2EF] text-[#687470]">
                  <UserRound size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#52615D]">
                    Account information
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#8A9290]">
                    Your caregiver account details will appear here
                    once authentication is connected.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-[#F7F4EC] px-4 py-3">
                <div className="flex items-start gap-2">
                  <Heart
                    size={15}
                    className="mt-0.5 shrink-0 text-[#A86A43]"
                  />

                  <p className="text-xs leading-5 text-[#687470]">
                    Your account will be used to securely manage
                    the family members and check-ins you have access to.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              PREFERENCES
          ================================================= */}

          <section className="mt-8">
            <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8A9290]">
              Preferences
            </h2>

            <div className="overflow-hidden rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8]">
              {/* NOTIFICATIONS */}

              <div className="flex items-center justify-between gap-4 border-b border-[#EEEAE1] p-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#176B5F]">
                    <Bell size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Notifications
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#8A9290]">
                      Manage reminders and review alerts
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setNotifications(!notifications)}
                  aria-label="Toggle notifications"
                  aria-pressed={notifications}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    notifications
                      ? "bg-[#176B5F]"
                      : "bg-[#C8D0CC]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      notifications ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* PRIVACY */}

              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8E7D8] text-[#A86A43]">
                    <ShieldCheck size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Privacy & consent
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#8A9290]">
                      Manage family member participation
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPrivacy(!privacy)}
                  aria-label="Toggle privacy consent"
                  aria-pressed={privacy}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    privacy
                      ? "bg-[#176B5F]"
                      : "bg-[#C8D0CC]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      privacy ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* =================================================
              PREFERENCES STATUS
          ================================================= */}

          <section className="mt-5 rounded-2xl border border-[#DCE8E2] bg-[#EEF4F2] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#176B5F]">
                <Check size={16} />
              </div>

              <div>
                <p className="text-xs font-semibold text-[#24584F]">
                  Current preference state
                </p>

                <p className="mt-0.5 text-[11px] text-[#687470]">
                  Notifications:{" "}
                  {notifications ? "On" : "Off"}
                  {" • "}
                  Privacy:{" "}
                  {privacy ? "Enabled" : "Disabled"}
                </p>

                <p className="mt-1 text-[10px] text-[#8A9290]">
                  Preferences will be persisted by the backend
                  when account settings are connected.
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              SUPPORT
          ================================================= */}

          <section className="mt-8">
            <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8A9290]">
              Support
            </h2>

            <div className="overflow-hidden rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8]">
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#F9F7F1]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#176B5F]">
                    <HelpCircle size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Help & support
                    </p>

                    <p className="mt-1 text-xs text-[#8A9290]">
                      Learn more about using Kahaani-Check
                    </p>
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  className={`shrink-0 text-[#8A9290] transition ${
                    showHelp ? "rotate-90" : ""
                  }`}
                />
              </button>

              {showHelp && (
                <div className="border-t border-[#EEEAE1] bg-[#F7F4EC] px-5 py-4">
                  <p className="text-xs leading-5 text-[#687470]">
                    Kahaani-Check helps families notice changes
                    in conversation patterns over time. Support
                    contact information will be provided once the
                    support workflow is finalized.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              ABOUT
          ================================================= */}

          <section className="mt-8">
            <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8A9290]">
              About
            </h2>

            <div className="rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] p-5">
              <div className="flex items-center gap-3">
                <div className="relative h-9 w-9">
                  <span className="absolute left-1 top-2 h-5 w-3 rotate-[-35deg] rounded-full bg-[#176B5F]" />
                  <span className="absolute left-4 top-1 h-5 w-3 rotate-[35deg] rounded-full bg-[#176B5F]" />
                  <span className="absolute left-2 top-5 h-4 w-3 rotate-[-20deg] rounded-full bg-[#E99B68]" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#24584F]">
                    Kahaani-Check
                  </p>

                  <p className="mt-0.5 text-xs text-[#8A9290]">
                    Because every story matters
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#EEEAE1] pt-4">
                <p className="text-xs text-[#8A9290]">
                  App version
                </p>

                <p className="text-xs font-medium text-[#687470]">
                  1.0.0
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              SIGN OUT
          ================================================= */}

          <section className="mt-8">
            <button
              type="button"
              onClick={() => setShowSignOut(!showSignOut)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#E8D7D3] bg-[#FFFDF8] p-5 text-left text-sm font-medium text-[#A14D45] transition hover:bg-[#FFF8F7]"
            >
              <LogOut size={19} />

              <span className="flex-1">
                Sign out
              </span>

              <ChevronRight
                size={18}
                className={`transition ${
                  showSignOut ? "rotate-90" : ""
                }`}
              />
            </button>

            {showSignOut && (
              <div className="mt-3 rounded-2xl border border-[#E8D7D3] bg-[#FFF8F7] p-5">
                <p className="text-sm font-semibold text-[#7E403B]">
                  Sign out of Kahaani-Check?
                </p>

                <p className="mt-1 text-xs leading-5 text-[#8A9290]">
                  Authentication will handle the actual sign-out
                  once the login system is connected.
                </p>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSignOut(false)}
                    className="rounded-xl border border-[#DDD8D2] bg-white px-4 py-2.5 text-xs font-medium text-[#687470]"
                  >
                    Cancel
                  </button>

                  <Link
                    href="/login"
                    className="rounded-xl bg-[#A14D45] px-4 py-2.5 text-xs font-semibold text-white"
                  >
                    Go to login
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="mt-8 text-center">
            <p className="text-xs leading-5 text-[#8A9290]">
              Kahaani-Check helps you notice changes over time
              while keeping your family conversations meaningful.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          MOBILE BOTTOM NAVIGATION
      ===================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E1D8] bg-[#FFFDF8]/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid h-[68px] max-w-[480px] grid-cols-4">
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center gap-1 text-[10px] text-[#87918D]"
          >
            <Home size={18} />
            Home
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex flex-col items-center justify-center gap-1 text-[10px] text-[#87918D]"
          >
            <Users size={18} />
            Elders
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex flex-col items-center justify-center gap-1 text-[10px] text-[#87918D]"
          >
            <CalendarDays size={18} />
            Check-ins
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-[#176B5F]"
          >
            <Settings size={18} />
            Settings
          </Link>
        </div>
      </nav>
    </main>
  );
}