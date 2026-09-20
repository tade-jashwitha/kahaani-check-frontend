"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Bell,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Info,
  Check,
  Volume2,
  Lock,
} from "lucide-react";

import PageContainer from "@/app/components/ui/PageContainer";
import PageHeader from "@/app/components/ui/PageHeader";
import Card from "@/app/components/ui/Card";
import SectionHeader from "@/app/components/ui/SectionHeader";
import SettingsRow from "@/app/components/ui/SettingsRow";
import Badge from "@/app/components/ui/Badge";
import Button from "@/app/components/ui/Button";
import { supabase } from "@/app/lib/supabase";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [voiceReminders, setVoiceReminders] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("caregiver@kahaani.local");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          return;
        }
      } catch {
        // offline
      }
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("kahaani_user_email");
        if (stored) {
          setUserEmail(stored);
          return;
        }
        const devToken = localStorage.getItem("kahaani_dev_token");
        if (devToken && devToken.includes(":")) {
          setUserEmail(devToken.split(":", 2)[1]);
        }
      }
    }
    loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("kahaani_dev_token");
      localStorage.removeItem("kahaani_user_email");
      localStorage.removeItem("kahaani_user_name");
    }
    window.location.href = "/login";
  };

  return (
    <PageContainer>
      {/* PAGE HEADER */}
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage caregiver account details, notification rules, and voice data privacy."
      />

      <div className="space-y-6">
        {/* 1. ACCOUNT SETTINGS */}
        <section>
          <SectionHeader title="Account" className="mb-3" />
          <Card className="divide-y divide-[#E3E8E5] p-0">
            <div className="p-5">
              <SettingsRow
                icon={<User size={18} />}
                title="Caregiver Account"
                description={`Signed in as ${userEmail}`}
                action={
                  <Badge variant="teal" icon={<ShieldCheck size={12} />}>
                    Verified
                  </Badge>
                }
              />
            </div>
          </Card>
        </section>

        {/* 2. PREFERENCES */}
        <section>
          <SectionHeader title="Preferences" className="mb-3" />
          <Card className="divide-y divide-[#E3E8E5] p-5">
            <SettingsRow
              icon={<Bell size={18} />}
              title="Weekly Check-in Notifications"
              description="Receive email summaries when weekly elder speech check-ins are processed."
              action={
                <button
                  type="button"
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications ? "bg-[#147D72]" : "bg-[#D4DCD8]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              }
            />

            <SettingsRow
              icon={<Volume2 size={18} />}
              title="Call Schedule Reminders"
              description="Automated alerts when an elder check-in window opens."
              action={
                <button
                  type="button"
                  onClick={() => setVoiceReminders(!voiceReminders)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    voiceReminders ? "bg-[#147D72]" : "bg-[#D4DCD8]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      voiceReminders ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              }
            />

            <SettingsRow
              icon={<Lock size={18} />}
              title="Encrypted Audio Storage"
              description="Store private speech recordings in encrypted Supabase Storage buckets."
              action={
                <Badge variant="green" icon={<Check size={12} />}>
                  Enabled
                </Badge>
              }
            />
          </Card>
        </section>

        {/* 3. SUPPORT & CLINICAL REFERENCE */}
        <section>
          <SectionHeader title="Support & Guidance" className="mb-3" />
          <Card className="divide-y divide-[#E3E8E5] p-5">
            <SettingsRow
              icon={<HelpCircle size={18} />}
              title="Clinical Methodology & Baselines"
              description="Understand how the 3-check-in baseline calibration and Z-score deviation model works."
              action={
                <span className="text-xs font-semibold text-[#147D72]">
                  Documentation
                </span>
              }
            />

            <SettingsRow
              icon={<ShieldCheck size={18} />}
              title="Voice Consent Audit"
              description="Every elder check-in requires explicit verbal or caregiver consent."
              action={
                <Badge variant="teal">Compliance Active</Badge>
              }
            />
          </Card>
        </section>

        {/* 4. ABOUT */}
        <section>
          <SectionHeader title="About Kahaani-Check" className="mb-3" />
          <Card className="divide-y divide-[#E3E8E5] p-5">
            <SettingsRow
              icon={<Info size={18} />}
              title="Platform Version"
              description="Kahaani-Check v0.1.0 • Release Candidate"
              action={
                <span className="text-xs text-[#8F9E9B]">Build 2026.09</span>
              }
            />
          </Card>
        </section>

        {/* 5. SIGN OUT (SEPARATED VISUALLY) */}
        <section className="pt-2">
          <Card className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold text-[#173B38]">
                Sign Out of Caregiver Portal
              </p>
              <p className="mt-0.5 text-xs text-[#6B7D79]">
                End your active session on this device.
              </p>
            </div>

            <Button
              variant="danger"
              size="md"
              icon={<LogOut size={15} />}
              loading={loggingOut}
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}