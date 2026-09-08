"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ArrowLeft,
  UserRound,
  Phone,
  CalendarDays,
  ShieldCheck,
  Camera,
  Heart,
  ClipboardList,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";

export default function AddElderPage() {
  // ============================================================
  // FORM STATE
  // ============================================================

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState("Friday");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // CONVERT AGE TO DOB YEAR RANGE
  // ============================================================

  function getDobYearRange(ageValue: string) {
    const numericAge = Number(ageValue);

    const currentYear = new Date().getFullYear();

    const birthYear = currentYear - numericAge;

    const decadeStart =
      Math.floor(birthYear / 10) * 10;

    return `${decadeStart}s`;
  }

  // ============================================================
  // NORMALIZE PHONE NUMBER
  // ============================================================

  function normalizePhone(phoneValue: string) {
    const cleaned = phoneValue.replace(/\s+/g, "");

    if (cleaned.startsWith("+")) {
      return cleaned;
    }

    if (cleaned.startsWith("0")) {
      return `+91${cleaned.slice(1)}`;
    }

    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }

    return cleaned;
  }

  // ============================================================
  // ADD ELDER
  // ============================================================

  async function handleAddElder() {
    setError("");
    setSuccess("");

    // --------------------------------------------
    // VALIDATION
    // --------------------------------------------

    if (!name.trim()) {
      setError(
        "Please enter the elder's name."
      );
      return;
    }

    if (!age) {
      setError(
        "Please enter the elder's age."
      );
      return;
    }

    const numericAge = Number(age);

    if (
      numericAge <= 0 ||
      numericAge > 120
    ) {
      setError(
        "Please enter a valid age."
      );
      return;
    }

    if (!relationship) {
      setError(
        "Please select the relationship."
      );
      return;
    }

    if (!phone.trim()) {
      setError(
        "Please enter the phone number."
      );
      return;
    }

    if (!consent) {
      setError(
        "Please confirm consent before continuing."
      );
      return;
    }

    // --------------------------------------------
    // PREPARE BACKEND DATA
    // --------------------------------------------

    const payload = {
      display_name: name.trim(),

      phone_e164: normalizePhone(phone),

      preferred_call_language: "hi",

      dob_year_range:
        getDobYearRange(age),

      timezone: "Asia/Kolkata",
    };

    // --------------------------------------------
    // SEND TO BACKEND
    // --------------------------------------------

    try {
      setSaving(true);

      const response = await apiFetch(
        "/v1/elders",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      console.log(
        "Elder created:",
        response
      );

      setSuccess(
        "Family member added successfully."
      );

      // Clear form
      setName("");
      setAge("");
      setRelationship("");
      setPhone("");
      setNotes("");
      setConsent(false);

      // Return to elders page
      setTimeout(() => {
        window.location.href =
          "/dashboard/elders";
      }, 1000);

    } catch (err) {
      console.error(
        "Failed to create elder:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add this family member."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <main className="min-h-screen bg-[#FBF7EE] text-[#263331]">

      {/* ======================================================
          DESKTOP SIDEBAR
      ======================================================= */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-[#E7E3D9] bg-[#FFFDF8] lg:block">

        <div className="flex items-center gap-3 px-7 py-7">

          <div className="relative h-9 w-9">

            <span className="absolute left-1 top-2 h-5 w-3 rotate-[-35deg] rounded-full bg-[#176B5F]" />

            <span className="absolute left-4 top-1 h-5 w-3 rotate-[35deg] rounded-full bg-[#176B5F]" />

            <span className="absolute left-2 top-5 h-4 w-3 rotate-[-20deg] rounded-full bg-[#E99B68]" />

          </div>

          <div>

            <p className="font-semibold tracking-tight text-[#24584F]">
              Kahaani-Check
            </p>

            <p className="text-[10px] text-[#87918D]">
              Because every story matters
            </p>

          </div>

        </div>

        <nav className="px-4">

          <Link
            href="/dashboard"
            className="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <span>⌂</span>
            Home
          </Link>

          <Link
            href="/dashboard/elders"
            className="mb-1 flex items-center gap-3 rounded-xl bg-[#EAF2EE] px-4 py-3 text-sm font-medium text-[#176B5F]"
          >
            <UserRound size={18} />
            Elders
          </Link>

          <Link
            href="/dashboard/elders"
            className="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <CalendarDays size={18} />
            Check-ins
          </Link>

          <Link
            href="/dashboard/elders"
            className="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#687470] transition hover:bg-[#F4F1E8]"
          >
            <Heart size={18} />
            Insights
          </Link>

        </nav>

      </aside>

      {/* ======================================================
          MAIN
      ======================================================= */}

      <div className="lg:pl-64">

        <div className="mx-auto max-w-4xl px-5 py-6 pb-32 sm:px-8 sm:py-8 lg:px-12 lg:py-10 lg:pb-12">

          {/* BACK */}

          <Link
            href="/dashboard/elders"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#687470] transition hover:text-[#176B5F]"
          >
            <ArrowLeft size={17} />
            Back to Elders
          </Link>

          {/* PAGE HEADER */}

          <div className="mt-7">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#176B5F] text-white shadow-sm">
                <UserRound size={22} />
              </div>

              <div>

                <h1 className="text-2xl font-semibold tracking-tight text-[#263331] sm:text-3xl">
                  Add an elder
                </h1>

                <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#74807C]">
                  Add someone you care for so
                  Kahaani-Check can help you stay
                  connected through meaningful
                  check-ins.
                </p>

              </div>

            </div>

          </div>

          {/* PROGRESS */}

          <div className="mt-8 rounded-2xl border border-[#E7E3D9] bg-[#FFFDF8] px-5 py-4 sm:px-6">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#176B5F] text-xs font-semibold text-white">
                  1
                </div>

                <span className="hidden text-sm font-medium text-[#315C55] sm:block">
                  Basic details
                </span>

              </div>

              <div className="mx-3 h-px flex-1 bg-[#DCE6E1]" />

              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2EF] text-xs font-medium text-[#8A9691]">
                  2
                </div>

                <span className="hidden text-sm text-[#8A9691] sm:block">
                  Care & check-ins
                </span>

              </div>

              <div className="mx-3 h-px flex-1 bg-[#E7E5DE]" />

              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2EF] text-xs font-medium text-[#8A9691]">
                  3
                </div>

                <span className="hidden text-sm text-[#8A9691] sm:block">
                  Review
                </span>

              </div>

            </div>

          </div>

          {/* FORM CARD */}

          <div className="mt-6 rounded-3xl border border-[#E7E3D9] bg-[#FFFDF8] p-5 shadow-[0_4px_20px_rgba(38,51,49,0.04)] sm:p-8">

            {/* PHOTO */}

            <section>

              <div className="flex flex-col items-center">

                <button
                  type="button"
                  className="group relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#BFD4CD] bg-[#F0F6F2] text-[#176B5F] transition hover:border-[#176B5F]"
                >
                  <Camera size={25} />

                  <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#FFFDF8] bg-[#176B5F] text-white">
                    +
                  </span>
                </button>

                <p className="mt-3 text-sm font-medium text-[#53615D]">
                  Add a photo
                </p>

                <p className="mt-0.5 text-xs text-[#8A9490]">
                  Optional
                </p>

              </div>

            </section>

            <div className="my-8 h-px bg-[#EEEAE1]" />

            {/* BASIC INFORMATION */}

            <section>

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF2EE] text-[#176B5F]">
                  <UserRound size={19} />
                </div>

                <div>

                  <h2 className="font-semibold text-[#263331]">
                    Basic information
                  </h2>

                  <p className="mt-1 text-sm text-[#7A8582]">
                    Tell us a little about your
                    family member.
                  </p>

                </div>

              </div>

              {/* NAME */}

              <div className="mt-6">

                <label
                  htmlFor="name"
                  className="text-sm font-medium text-[#3D4A47]"
                >
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Enter their name"
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-[#DCDDD9] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#A0A6A3] focus:border-[#176B5F] focus:ring-2 focus:ring-[#176B5F]/10 disabled:bg-[#F5F5F2]"
                />

              </div>

              {/* AGE + RELATIONSHIP */}

              <div className="mt-5 grid gap-5 sm:grid-cols-2">

                <div>

                  <label
                    htmlFor="age"
                    className="text-sm font-medium text-[#3D4A47]"
                  >
                    Age
                  </label>

                  <input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) =>
                      setAge(
                        e.target.value
                      )
                    }
                    placeholder="Enter age"
                    min="1"
                    max="120"
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-[#DCDDD9] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#A0A6A3] focus:border-[#176B5F] focus:ring-2 focus:ring-[#176B5F]/10 disabled:bg-[#F5F5F2]"
                  />

                </div>

                <div>

                  <label
                    htmlFor="relationship"
                    className="text-sm font-medium text-[#3D4A47]"
                  >
                    Relationship
                  </label>

                  <select
                    id="relationship"
                    value={relationship}
                    onChange={(e) =>
                      setRelationship(
                        e.target.value
                      )
                    }
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-[#DCDDD9] bg-white px-4 py-3 text-sm outline-none focus:border-[#176B5F] focus:ring-2 focus:ring-[#176B5F]/10 disabled:bg-[#F5F5F2]"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select relationship
                    </option>

                    <option>
                      Mother
                    </option>

                    <option>
                      Father
                    </option>

                    <option>
                      Grandmother
                    </option>

                    <option>
                      Grandfather
                    </option>

                    <option>
                      Aunt
                    </option>

                    <option>
                      Uncle
                    </option>

                    <option>
                      Father-in-law
                    </option>

                    <option>
                      Mother-in-law
                    </option>

                    <option>
                      Other
                    </option>

                  </select>

                </div>

              </div>

              {/* PHONE */}

              <div className="mt-5">

                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-[#3D4A47]"
                >
                  Phone number
                </label>

                <div className="relative mt-2">

                  <Phone
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A9290]"
                  />

                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    placeholder="+91 9876543210"
                    disabled={saving}
                    className="w-full rounded-xl border border-[#DCDDD9] bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-[#A0A6A3] focus:border-[#176B5F] focus:ring-2 focus:ring-[#176B5F]/10 disabled:bg-[#F5F5F2]"
                  />

                </div>

                <p className="mt-2 text-xs text-[#8A9290]">
                  Use an Indian mobile number
                  for this prototype.
                </p>

              </div>

            </section>

            {/* CARE & CHECK-IN */}

            <section className="mt-9 border-t border-[#EEEAE1] pt-8">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8E7D8] text-[#A86A43]">
                  <ClipboardList size={19} />
                </div>

                <div>

                  <h2 className="font-semibold text-[#263331]">
                    Care & check-ins
                  </h2>

                  <p className="mt-1 text-sm text-[#7A8582]">
                    Set up how you would like to
                    stay connected.
                  </p>

                </div>

              </div>

              {/* WEEKLY CHECK-IN */}

              <div className="mt-6 rounded-2xl bg-[#F7F4EC] p-5">

                <div className="flex items-center gap-2">

                  <CalendarDays
                    size={18}
                    className="text-[#176B5F]"
                  />

                  <h3 className="text-sm font-semibold">
                    Weekly check-in
                  </h3>

                </div>

                <p className="mt-1 text-xs leading-5 text-[#7A8582]">
                  Choose when you would
                  usually like to check in.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">

                  {/* DAY */}

                  <div>

                    <label
                      htmlFor="day"
                      className="text-sm font-medium"
                    >
                      Day
                    </label>

                    <select
                      id="day"
                      value={day}
                      onChange={(e) =>
                        setDay(
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className="mt-2 w-full rounded-xl border border-[#DCDDD9] bg-white px-4 py-3 text-sm outline-none focus:border-[#176B5F]"
                    >
                      <option>
                        Monday
                      </option>

                      <option>
                        Tuesday
                      </option>

                      <option>
                        Wednesday
                      </option>

                      <option>
                        Thursday
                      </option>

                      <option>
                        Friday
                      </option>

                      <option>
                        Saturday
                      </option>

                      <option>
                        Sunday
                      </option>

                    </select>

                  </div>

                  {/* TIME */}

                  <div>

                    <label
                      htmlFor="time"
                      className="text-sm font-medium"
                    >
                      Time
                    </label>

                    <input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) =>
                        setTime(
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className="mt-2 w-full rounded-xl border border-[#DCDDD9] bg-white px-4 py-3 text-sm outline-none focus:border-[#176B5F]"
                    />

                  </div>

                </div>

              </div>

              {/* NOTES */}

              <div className="mt-5">

                <label
                  htmlFor="notes"
                  className="text-sm font-medium text-[#3D4A47]"
                >
                  Additional notes
                </label>

                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                  rows={4}
                  disabled={saving}
                  placeholder="Anything that would help you care for them..."
                  className="mt-2 w-full resize-none rounded-xl border border-[#DCDDD9] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#A0A6A3] focus:border-[#176B5F] focus:ring-2 focus:ring-[#176B5F]/10 disabled:bg-[#F5F5F2]"
                />

              </div>

            </section>

            {/* CONSENT */}

            <section className="mt-9 border-t border-[#EEEAE1] pt-8">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF5EF] text-[#39704F]">
                  <ShieldCheck size={19} />
                </div>

                <div>

                  <h2 className="font-semibold">
                    Consent & privacy
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-[#7A8582]">
                    The family member must provide
                    consent before check-ins are
                    recorded and analyzed.
                  </p>

                </div>

              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E4E9E4] bg-[#F5F8F5] p-4 transition hover:bg-[#F1F6F2]">

                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) =>
                    setConsent(
                      e.target.checked
                    )
                  }
                  disabled={saving}
                  className="mt-1 h-4 w-4 accent-[#176B5F]"
                />

                <span className="text-sm leading-6 text-[#53615D]">
                  I understand that the family
                  member must agree to
                  participate before the
                  check-in service begins.
                </span>

              </label>

            </section>

            {/* ERROR */}

            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#E8DDD4] bg-[#FBF0E9] p-4">

                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0 text-[#A86A43]"
                />

                <p className="text-sm leading-6 text-[#7A5A47]">
                  {error}
                </p>

              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#DCE8E2] bg-[#EEF7F2] p-4">

                <CheckCircle2
                  size={19}
                  className="mt-0.5 shrink-0 text-[#315C55]"
                />

                <p className="text-sm leading-6 text-[#315C55]">
                  {success}
                </p>

              </div>
            )}

            {/* ACTIONS */}

            <div className="mt-9 flex flex-col-reverse gap-3 border-t border-[#EEEAE1] pt-7 sm:flex-row sm:justify-end">

              <Link
                href="/dashboard/elders"
                className="rounded-xl border border-[#DCDDD9] bg-white px-6 py-3 text-center text-sm font-medium text-[#315C55] transition hover:bg-[#F7F7F5]"
              >
                Cancel
              </Link>

              <button
                type="button"
                disabled={
                  !consent ||
                  saving
                }
                onClick={
                  handleAddElder
                }
                className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition ${
                  consent &&
                  !saving
                    ? "bg-[#176B5F] hover:bg-[#12584F]"
                    : "cursor-not-allowed bg-[#B9C6C1]"
                }`}
              >

                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Adding...
                  </>
                ) : (
                  "Add family member"
                )}

              </button>

            </div>

          </div>

          {/* PRIVACY NOTE */}

          <p className="mx-auto mt-6 max-w-lg text-center text-xs leading-5 text-[#8A9290]">
            You can change family member
            details and preferences later
            from their profile.
          </p>

        </div>

      </div>

      {/* ======================================================
          MOBILE BOTTOM NAV
      ======================================================= */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E1D8] bg-[#FFFDF8]/95 px-2 py-2 backdrop-blur lg:hidden">

        <div className="mx-auto flex max-w-md items-center justify-around">

          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-[#87918D]"
          >
            <span className="text-lg">
              ⌂
            </span>
            Home
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium text-[#176B5F]"
          >
            <UserRound size={19} />
            Elders
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-[#87918D]"
          >
            <CalendarDays size={19} />
            Check-ins
          </Link>

          <Link
            href="/dashboard/elders"
            className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-[#87918D]"
          >
            <Heart size={19} />
            Insights
          </Link>

        </div>

      </nav>

    </main>
  );
}