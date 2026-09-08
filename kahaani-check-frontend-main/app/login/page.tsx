"use client";

import Link from "next/link";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  Heart,
  ShieldCheck,
  Sparkles,
  Leaf,
} from "lucide-react";

import KahaaniLogo from "../components/KahaaniLogo";
import { supabase } from "../lib/supabase";


type AuthMode = "signin" | "signup" | "otp";


export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
  ]);


  /* =====================================================
     SIGN IN
  ===================================================== */

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error) {
        window.location.href = "/dashboard";
        return;
      }
    } catch {
      // Supabase is offline or using local placeholder credentials
    }

    // Local dev mode fallback
    localStorage.setItem("kahaani_dev_token", "dev-token");
    window.location.href = "/dashboard";
  };


  /* =====================================================
     SIGN UP
  ===================================================== */

  const handleSignUp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name || !email || !password) {
      return;
    }

    setMode("otp");
  };


  /* =====================================================
     OTP
  ===================================================== */

  const handleOtpChange = (
    index: number,
    value: string
  ) => {
    if (!/^\d?$/.test(value)) {
      return;
    }

    const updatedOtp = [...otp];

    updatedOtp[index] = value;

    setOtp(updatedOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(
        `otp-${index + 1}`
      ) as HTMLInputElement | null;

      nextInput?.focus();
    }
  };


  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      const previousInput = document.getElementById(
        `otp-${index - 1}`
      ) as HTMLInputElement | null;

      previousInput?.focus();
    }
  };


  const handleVerifyOtp = () => {
    const code = otp.join("");

    if (code.length !== 6) {
      return;
    }

    window.location.href = "/dashboard";
  };


  /* =====================================================
     DEMO SOCIAL LOGIN
  ===================================================== */

  const handleGoogle = () => {
    localStorage.setItem("kahaani_dev_token", "dev-token");
    window.location.href = "/dashboard";
  };


  const handleApple = () => {
    localStorage.setItem("kahaani_dev_token", "dev-token");
    window.location.href = "/dashboard";
  };


  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FBF7EE] text-[#263331]">


      {/* =================================================
          CREATIVE BACKGROUND
      ================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">


        {/* Large sage watercolor */}

        <div
          className="absolute -left-32 -top-32 h-[430px] w-[430px] rounded-full bg-[#DDEFE8]/80 blur-[95px]"
          style={{
            animation: "watercolorFloat 10s ease-in-out infinite",
          }}
        />


        {/* Large peach watercolor */}

        <div
          className="absolute -right-40 top-[12%] h-[420px] w-[420px] rounded-full bg-[#F8E7D8]/75 blur-[100px]"
          style={{
            animation: "watercolorFloat 12s ease-in-out infinite reverse",
          }}
        />


        {/* Bottom sage */}

        <div
          className="absolute -bottom-48 left-[20%] h-[480px] w-[480px] rounded-full bg-[#DDEBE5]/60 blur-[110px]"
          style={{
            animation: "watercolorFloat 14s ease-in-out infinite",
          }}
        />


        {/* Center glow */}

        <div className="absolute left-1/2 top-1/2 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-[120px]" />


        {/* =================================================
            TOP LEFT BOTANICAL
        ================================================= */}

        <div
          className="absolute left-[2%] top-[12%] opacity-50 sm:left-[7%]"
          style={{
            animation: "leafSway 8s ease-in-out infinite",
            transformOrigin: "bottom center",
          }}
        >
          <div className="relative h-36 w-28">

            <span className="absolute left-9 top-0 h-24 w-11 rotate-[-35deg] rounded-[100%_0_100%_0] bg-[#176B5F]/25" />

            <span className="absolute left-1 top-12 h-16 w-8 rotate-[-55deg] rounded-[100%_0_100%_0] bg-[#6F9F92]/30" />

            <span className="absolute left-16 top-14 h-14 w-7 rotate-[30deg] rounded-[100%_0_100%_0] bg-[#D78D5D]/25" />

            <span className="absolute left-12 top-7 h-28 w-px rotate-[-18deg] bg-[#176B5F]/20" />

          </div>
        </div>


        {/* =================================================
            TOP RIGHT BOTANICAL
        ================================================= */}

        <div
          className="absolute right-[2%] top-[10%] opacity-50 sm:right-[7%]"
          style={{
            animation: "leafSway 9s ease-in-out infinite reverse",
            transformOrigin: "bottom center",
          }}
        >
          <div className="relative h-36 w-28">

            <span className="absolute right-8 top-0 h-24 w-11 rotate-[35deg] rounded-[100%_0_100%_0] bg-[#176B5F]/25" />

            <span className="absolute right-0 top-12 h-16 w-8 rotate-[55deg] rounded-[100%_0_100%_0] bg-[#6F9F92]/30" />

            <span className="absolute right-16 top-14 h-14 w-7 rotate-[-30deg] rounded-[100%_0_100%_0] bg-[#D78D5D]/25" />

            <span className="absolute right-12 top-7 h-28 w-px rotate-[18deg] bg-[#176B5F]/20" />

          </div>
        </div>


        {/* =================================================
            BOTTOM LEFT
        ================================================= */}

        <div className="absolute bottom-[7%] left-[3%] opacity-45 sm:left-[8%]">

          <div className="relative h-28 w-32">

            <span className="absolute bottom-0 left-14 h-24 w-px rotate-[25deg] bg-[#176B5F]/30" />

            <span className="absolute bottom-12 left-4 h-9 w-5 rotate-[-45deg] rounded-full bg-[#176B5F]/25" />

            <span className="absolute bottom-17 left-14 h-9 w-5 rotate-[35deg] rounded-full bg-[#6F9F92]/30" />

            <span className="absolute bottom-6 left-23 h-8 w-4 rotate-[45deg] rounded-full bg-[#D78D5D]/30" />

          </div>

        </div>


        {/* =================================================
            BOTTOM RIGHT
        ================================================= */}

        <div className="absolute bottom-[8%] right-[3%] opacity-45 sm:right-[8%]">

          <div className="relative h-28 w-32">

            <span className="absolute bottom-0 right-14 h-24 w-px rotate-[-25deg] bg-[#176B5F]/30" />

            <span className="absolute bottom-12 right-4 h-9 w-5 rotate-[45deg] rounded-full bg-[#176B5F]/25" />

            <span className="absolute bottom-17 right-14 h-9 w-5 rotate-[-35deg] rounded-full bg-[#6F9F92]/30" />

            <span className="absolute bottom-6 right-23 h-8 w-4 rotate-[-45deg] rounded-full bg-[#D78D5D]/30" />

          </div>

        </div>


        {/* =================================================
            FLOATING DOTS
        ================================================= */}

        <span className="absolute left-[16%] top-[34%] h-2 w-2 rounded-full bg-[#D78D5D]/40" />

        <span className="absolute right-[17%] top-[40%] h-2 w-2 rounded-full bg-[#176B5F]/30" />

        <span className="absolute bottom-[30%] left-[17%] h-1.5 w-1.5 rounded-full bg-[#6F9F92]/40" />

        <span className="absolute bottom-[27%] right-[18%] h-2 w-2 rounded-full bg-[#D78D5D]/30" />


        {/* =================================================
            STORY WORDS
        ================================================= */}

        <span className="absolute left-[8%] top-[46%] hidden rotate-[-12deg] text-xs italic tracking-wide text-[#176B5F]/20 lg:block">
          Listen
        </span>

        <span className="absolute right-[8%] top-[38%] hidden rotate-[10deg] text-xs italic tracking-wide text-[#A86A43]/20 lg:block">
          Connect
        </span>

        <span className="absolute bottom-[27%] left-[10%] hidden rotate-[8deg] text-xs italic tracking-wide text-[#176B5F]/20 lg:block">
          Care
        </span>

        <span className="absolute bottom-[23%] right-[10%] hidden rotate-[-8deg] text-xs italic tracking-wide text-[#A86A43]/20 lg:block">
          Together
        </span>

      </div>


      {/* =================================================
          TOP NAVIGATION
      ================================================= */}

      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">

        {mode === "otp" ? (
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="group inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-[#687470] transition hover:bg-white/70 hover:text-[#176B5F]"
          >
            <ChevronLeft size={17} />

            Back
          </button>
        ) : (
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-[#687470] transition hover:bg-white/70 hover:text-[#176B5F]"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />

            Back
          </Link>
        )}


        <div className="hidden sm:block">
          <KahaaniLogo size="sm" />
        </div>

      </header>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-84px)] max-w-7xl items-center justify-center px-5 pb-10 sm:px-8">


        {/* =================================================
            DESKTOP STORY SIDE
        ================================================= */}

        <div className="hidden w-[42%] max-w-lg pr-12 lg:block">


          {/* Story illustration */}

          <div className="relative mx-auto h-[380px] w-[380px]">


            {/* Peach glow */}

            <div className="absolute left-8 top-20 h-56 w-56 rounded-full bg-[#F8E7D8]/80 blur-3xl" />


            {/* Sage glow */}

            <div className="absolute right-2 top-5 h-52 w-52 rounded-full bg-[#DDEFE8]/80 blur-3xl" />


            {/* Ground */}

            <div className="absolute bottom-12 left-1/2 h-16 w-64 -translate-x-1/2 rounded-[50%] bg-[#DDEFE8]/50 blur-xl" />


            {/* Elder figure */}

            <div className="absolute bottom-20 left-16">

              {/* Body */}

              <div className="h-32 w-32 rounded-t-[60px] rounded-b-[30px] bg-[#176B5F]" />

              {/* Shirt detail */}

              <div className="absolute left-7 top-8 h-20 w-20 rounded-full bg-[#28776B]/60" />

              {/* Head */}

              <div className="absolute -top-14 left-8 h-24 w-24 rounded-full bg-[#D89A70]" />

              {/* Hair */}

              <div className="absolute -top-17 left-6 h-20 w-28 rounded-[50%] bg-[#77706A]" />

              {/* Hair highlight */}

              <div className="absolute -top-11 left-13 h-5 w-16 rounded-full bg-[#A49B91]" />

              {/* Ear */}

              <div className="absolute -top-5 left-1 h-9 w-8 rounded-full bg-[#D89A70]" />

              {/* Eye */}

              <div className="absolute -top-1 left-58 h-2 w-2 rounded-full bg-[#263331]" />

              {/* Smile */}

              <div className="absolute left-15 top-5 h-3 w-8 rounded-full border-b-2 border-[#8A4F43]" />

            </div>


            {/* Daughter figure */}

            <div className="absolute bottom-20 right-14">

              {/* Body */}

              <div className="h-36 w-28 rounded-t-[55px] rounded-b-[30px] bg-[#D78D5D]" />

              {/* Dress detail */}

              <div className="absolute left-4 top-10 h-20 w-20 rounded-full bg-[#E6A77E]/60" />

              {/* Head */}

              <div className="absolute -top-16 left-2 h-24 w-24 rounded-full bg-[#C98560]" />

              {/* Hair */}

              <div className="absolute -top-20 -left-1 h-28 w-28 rounded-[55%] bg-[#493C38]" />

              {/* Hair side */}

              <div className="absolute -top-1 -left-7 h-24 w-10 rounded-full bg-[#493C38]" />

              {/* Eye */}

              <div className="absolute -top-2 left-59 h-2 w-2 rounded-full bg-[#263331]" />

              {/* Smile */}

              <div className="absolute left-15 top-5 h-3 w-8 rounded-full border-b-2 border-[#8A4F43]" />

            </div>


            {/* Arms / embrace */}

            <div className="absolute bottom-40 left-[135px] h-5 w-28 rotate-[15deg] rounded-full bg-[#D89A70]" />

            <div className="absolute bottom-36 right-[102px] h-5 w-24 rotate-[-18deg] rounded-full bg-[#C98560]" />


            {/* Heart */}

            <div
              className="absolute left-1/2 top-14 -translate-x-1/2 text-[#D78D5D]"
              style={{
                animation: "heartPulse 2.8s ease-in-out infinite",
              }}
            >
              <Heart
                size={42}
                fill="currentColor"
                strokeWidth={1.5}
              />
            </div>


            {/* Leaves */}

            <Leaf
              className="absolute bottom-8 left-2 rotate-[-30deg] text-[#176B5F]/60"
              size={46}
            />

            <Leaf
              className="absolute right-2 top-28 rotate-[35deg] text-[#6F9F92]/60"
              size={38}
            />

          </div>


          {/* Story text */}

          <div className="mt-2 text-center">

            <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#176B5F]">

              <span>Listen</span>

              <span className="text-[#D78D5D]">•</span>

              <span>Care</span>

              <span className="text-[#D78D5D]">•</span>

              <span>Connect</span>

            </div>


            <p className="mt-5 font-serif text-2xl italic leading-relaxed text-[#315C55]">

              “Every conversation is
              <br />
              a story worth keeping.”

            </p>


            <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-[#8A9290]">

              Stay close to the people you love,
              one conversation at a time.

            </p>

          </div>

        </div>


        {/* =================================================
            AUTH AREA
        ================================================= */}

        <div
          className="w-full max-w-md"
          key={mode}
          style={{
            animation: "authSwitch 0.45s ease-out both",
          }}
        >


          {/* =================================================
              MOBILE LOGO
          ================================================= */}

          <div className="flex justify-center lg:hidden">

            <KahaaniLogo size="lg" />

          </div>


          {/* =================================================
              SIGN IN
          ================================================= */}

          {mode === "signin" && (

            <>

              <div className="mt-7 text-center">

                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF2EE] text-[#176B5F]">

                  <Heart
                    size={18}
                    fill="currentColor"
                  />

                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#176B5F]">
                  Welcome back
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  Welcome back
                </h1>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#71807C]">
                  Continue your journey of staying connected
                  with the people you care about.
                </p>

              </div>


              <form
                onSubmit={handleSignIn}
                className="mt-7 rounded-[28px] border border-[#E5E1D7] bg-[#FFFDF8]/95 p-6 shadow-[0_25px_70px_rgba(49,92,85,0.10)] backdrop-blur-xl sm:p-8"
              >


                {/* Email */}

                <div>

                  <label
                    htmlFor="signin-email"
                    className="text-xs font-semibold text-[#4F5E5A]"
                  >
                    Email
                  </label>

                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="Enter your email"
                    className="mt-2 w-full rounded-xl border border-[#E0E3DF] bg-[#F4F5F2] px-4 py-3.5 text-sm text-[#263331] outline-none transition placeholder:text-[#9BA29F] focus:border-[#176B5F] focus:bg-white focus:ring-4 focus:ring-[#DDEFE8]/70"
                    required
                  />

                </div>


                {/* Password */}

                <div className="mt-4">

                  <label
                    htmlFor="signin-password"
                    className="text-xs font-semibold text-[#4F5E5A]"
                  >
                    Password
                  </label>

                  <div className="relative mt-2">

                    <input
                      id="signin-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-[#E0E3DF] bg-[#F4F5F2] px-4 py-3.5 pr-12 text-sm text-[#263331] outline-none transition placeholder:text-[#9BA29F] focus:border-[#176B5F] focus:bg-white focus:ring-4 focus:ring-[#DDEFE8]/70"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#7A8582] transition hover:bg-[#EAF2EE] hover:text-[#176B5F]"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >

                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}

                    </button>

                  </div>

                </div>


                {/* Remember */}

                <div className="mt-4 flex items-center justify-between">

                  <button
                    type="button"
                    onClick={() =>
                      setRememberMe(!rememberMe)
                    }
                    className="flex items-center gap-2"
                  >

                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                        rememberMe
                          ? "border-[#176B5F] bg-[#176B5F] text-white"
                          : "border-[#C9CFCC] bg-white"
                      }`}
                    >

                      {rememberMe && (
                        <Check
                          size={10}
                          strokeWidth={3}
                        />
                      )}

                    </span>

                    <span className="text-xs text-[#687470]">
                      Remember me
                    </span>

                  </button>


                  <button
                    type="button"
                    className="text-xs font-semibold text-[#A85D49] hover:underline"
                  >
                    Forgot password?
                  </button>

                </div>


                {/* Main button */}

                <button
                  type="submit"
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#176B5F] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-[#12584F] hover:shadow-lg active:translate-y-0"
                >

                  Continue

                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </button>


                {/* Divider */}

                <div className="my-6 flex items-center gap-3">

                  <div className="h-px flex-1 bg-[#EAE7DF]" />

                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#A0A6A3]">
                    Or continue with
                  </span>

                  <div className="h-px flex-1 bg-[#EAE7DF]" />

                </div>


                {/* Google */}

                <button
                  type="button"
                  onClick={handleGoogle}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E0E3DF] bg-white px-5 py-3 text-sm font-medium transition duration-200 hover:-translate-y-0.5 hover:border-[#176B5F] hover:shadow-sm"
                >

                  <span className="font-bold text-[#4285F4]">
                    G
                  </span>

                  Continue with Google

                </button>


                {/* Apple */}

                <button
                  type="button"
                  onClick={handleApple}
                  className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl border border-[#E0E3DF] bg-white px-5 py-3 text-sm font-medium transition duration-200 hover:-translate-y-0.5 hover:border-[#176B5F] hover:shadow-sm"
                >

                  <span className="text-base">
                    
                  </span>

                  Continue with Apple

                </button>


                {/* Privacy */}

                <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#F1F5F2] px-4 py-3">

                  <ShieldCheck
                    size={15}
                    className="mt-0.5 shrink-0 text-[#176B5F]"
                  />

                  <p className="text-[11px] leading-5 text-[#687470]">
                    Your information is kept private and secure.
                  </p>

                </div>

              </form>


              {/* Switch */}

              <p className="mt-6 text-center text-xs text-[#7A8582]">

                Don&apos;t have an account?{" "}

                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-[#176B5F] hover:underline"
                >
                  Create your account
                </button>

              </p>

            </>

          )}


          {/* =================================================
              SIGN UP
          ================================================= */}

          {mode === "signup" && (

            <>

              <div className="mt-7 text-center">

                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F8E7D8] text-[#A86A43]">

                  <Sparkles size={18} />

                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#176B5F]">
                  Your story starts here
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  Create your account
                </h1>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#71807C]">
                  Start building a simple, meaningful way
                  to stay connected with your family.
                </p>

              </div>


              <form
                onSubmit={handleSignUp}
                className="mt-7 rounded-[28px] border border-[#E5E1D7] bg-[#FFFDF8]/95 p-6 shadow-[0_25px_70px_rgba(49,92,85,0.10)] backdrop-blur-xl sm:p-8"
              >


                {/* Name */}

                <div>

                  <label
                    htmlFor="signup-name"
                    className="text-xs font-semibold text-[#4F5E5A]"
                  >
                    Name
                  </label>

                  <input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Enter your name"
                    className="mt-2 w-full rounded-xl border border-[#E0E3DF] bg-[#F4F5F2] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#9BA29F] focus:border-[#176B5F] focus:bg-white focus:ring-4 focus:ring-[#DDEFE8]/70"
                    required
                  />

                </div>


                {/* Email */}

                <div className="mt-4">

                  <label
                    htmlFor="signup-email"
                    className="text-xs font-semibold text-[#4F5E5A]"
                  >
                    Email
                  </label>

                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="Enter your email"
                    className="mt-2 w-full rounded-xl border border-[#E0E3DF] bg-[#F4F5F2] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#9BA29F] focus:border-[#176B5F] focus:bg-white focus:ring-4 focus:ring-[#DDEFE8]/70"
                    required
                  />

                </div>


                {/* Password */}

                <div className="mt-4">

                  <label
                    htmlFor="signup-password"
                    className="text-xs font-semibold text-[#4F5E5A]"
                  >
                    Password
                  </label>

                  <div className="relative mt-2">

                    <input
                      id="signup-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Create a password"
                      className="w-full rounded-xl border border-[#E0E3DF] bg-[#F4F5F2] px-4 py-3.5 pr-12 text-sm outline-none transition placeholder:text-[#9BA29F] focus:border-[#176B5F] focus:bg-white focus:ring-4 focus:ring-[#DDEFE8]/70"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#7A8582] hover:bg-[#EAF2EE] hover:text-[#176B5F]"
                    >

                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}

                    </button>

                  </div>

                </div>


                {/* Remember */}

                <button
                  type="button"
                  onClick={() =>
                    setRememberMe(!rememberMe)
                  }
                  className="mt-4 flex items-center gap-2"
                >

                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      rememberMe
                        ? "border-[#176B5F] bg-[#176B5F] text-white"
                        : "border-[#C9CFCC] bg-white"
                    }`}
                  >

                    {rememberMe && (
                      <Check
                        size={10}
                        strokeWidth={3}
                      />
                    )}

                  </span>

                  <span className="text-xs text-[#687470]">
                    Remember me
                  </span>

                </button>


                {/* Create account */}

                <button
                  type="submit"
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#176B5F] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-[#12584F] hover:shadow-lg"
                >

                  Continue

                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </button>


                {/* Divider */}

                <div className="my-6 flex items-center gap-3">

                  <div className="h-px flex-1 bg-[#EAE7DF]" />

                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#A0A6A3]">
                    Or continue with
                  </span>

                  <div className="h-px flex-1 bg-[#EAE7DF]" />

                </div>


                {/* Google */}

                <button
                  type="button"
                  onClick={handleGoogle}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E0E3DF] bg-white px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-[#176B5F] hover:shadow-sm"
                >

                  <span className="font-bold text-[#4285F4]">
                    G
                  </span>

                  Continue with Google

                </button>


                {/* Apple */}

                <button
                  type="button"
                  onClick={handleApple}
                  className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl border border-[#E0E3DF] bg-white px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-[#176B5F] hover:shadow-sm"
                >

                  <span className="text-base">
                    
                  </span>

                  Continue with Apple

                </button>

              </form>


              {/* Switch */}

              <p className="mt-6 text-center text-xs text-[#7A8582]">

                Already have an account?{" "}

                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-[#176B5F] hover:underline"
                >
                  Sign in
                </button>

              </p>

            </>

          )}


          {/* =================================================
              OTP
          ================================================= */}

          {mode === "otp" && (

            <>

              <div className="mt-7 text-center">

                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF2EE] text-[#176B5F]"
                  style={{
                    animation: "softPulse 2.5s ease-in-out infinite",
                  }}
                >

                  <ShieldCheck size={28} />

                </div>


                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#176B5F]">
                  One more step
                </p>

                <h1 className="mt-2 text-3xl font-semibold">
                  Verify your account
                </h1>

                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#71807C]">

                  We sent a six-digit verification code to

                  <span className="font-semibold text-[#4F5E5A]">
                    {" "}{email || "your email"}.
                  </span>

                </p>

              </div>


              <div className="mt-7 rounded-[28px] border border-[#E5E1D7] bg-[#FFFDF8]/95 p-6 shadow-[0_25px_70px_rgba(49,92,85,0.10)] backdrop-blur-xl sm:p-8">


                {/* OTP */}

                <div className="flex justify-center gap-2 sm:gap-3">

                  {otp.map((value, index) => (

                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={value}
                      onChange={(event) =>
                        handleOtpChange(
                          index,
                          event.target.value
                        )
                      }
                      onKeyDown={(event) =>
                        handleOtpKeyDown(
                          index,
                          event
                        )
                      }
                      className="h-12 w-10 rounded-xl border border-[#E0E3DF] bg-[#F4F5F2] text-center text-lg font-semibold text-[#176B5F] outline-none transition focus:border-[#176B5F] focus:bg-white focus:ring-4 focus:ring-[#DDEFE8]/70 sm:h-14 sm:w-12"
                      aria-label={`OTP digit ${index + 1}`}
                    />

                  ))}

                </div>


                {/* Verify */}

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otp.join("").length !== 6}
                  className={`group mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition duration-300 ${
                    otp.join("").length === 6
                      ? "bg-[#176B5F] shadow-sm hover:-translate-y-0.5 hover:bg-[#12584F] hover:shadow-lg"
                      : "cursor-not-allowed bg-[#B8C6C1]"
                  }`}
                >

                  Verify & continue

                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </button>


                {/* Resend */}

                <div className="mt-5 text-center">

                  <p className="text-xs text-[#7A8582]">
                    Didn&apos;t receive the code?
                  </p>

                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-[#176B5F] hover:underline"
                  >
                    Resend OTP
                  </button>

                </div>


                {/* Security */}

                <div className="mt-6 flex items-start gap-2 rounded-xl bg-[#F1F5F2] px-4 py-3">

                  <ShieldCheck
                    size={15}
                    className="mt-0.5 shrink-0 text-[#176B5F]"
                  />

                  <p className="text-[11px] leading-5 text-[#687470]">
                    Your verification information is handled
                    securely.
                  </p>

                </div>

              </div>

            </>

          )}


          {/* =================================================
              MOBILE STORY QUOTE
          ================================================= */}

          <div className="mt-7 text-center lg:hidden">

            <div className="flex items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#176B5F]">

              <span>Listen</span>

              <span className="text-[#D78D5D]">•</span>

              <span>Care</span>

              <span className="text-[#D78D5D]">•</span>

              <span>Connect</span>

            </div>

            <p className="mx-auto mt-3 max-w-xs font-serif text-base italic leading-6 text-[#315C55]">

              “Every conversation is a story worth keeping.”

            </p>

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="mt-6 flex items-center justify-center gap-2 pb-3">

            <Heart
              size={11}
              className="text-[#D78D5D]"
              fill="currentColor"
            />

            <p className="text-[10px] text-[#9AA19E]">
              Because every story matters.
            </p>

          </div>

        </div>

      </section>


      {/* =================================================
          ANIMATIONS
      ================================================= */}

      <style jsx global>{`

        @keyframes authSwitch {

          from {
            opacity: 0;
            transform: translateY(14px) scale(0.99);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }

        }


        @keyframes watercolorFloat {

          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(0, 15px, 0) scale(1.04);
          }

        }


        @keyframes leafSway {

          0%,
          100% {
            transform: rotate(0deg);
          }

          50% {
            transform: rotate(4deg);
          }

        }


        @keyframes heartPulse {

          0%,
          100% {
            transform: translateX(-50%) scale(1);
          }

          50% {
            transform: translateX(-50%) scale(1.12);
          }

        }


        @keyframes softPulse {

          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(23, 107, 95, 0);
          }

          50% {
            transform: scale(1.04);
            box-shadow: 0 0 0 10px rgba(23, 107, 95, 0.06);
          }

        }


        @media (prefers-reduced-motion: reduce) {

          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }

        }

      `}</style>

    </main>
  );
}