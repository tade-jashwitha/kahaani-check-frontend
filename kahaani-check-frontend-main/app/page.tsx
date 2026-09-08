import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-[#FBF7EE] text-[#263331]">

      {/* Soft background shapes */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#EAF2EE] opacity-70 blur-[90px]" />

        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#F1E5D2] opacity-70 blur-[110px]" />
      </div>

      {/* Main mobile-first container */}
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-8 pt-5 sm:px-7">

        {/* Back button */}
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#315C55] shadow-sm backdrop-blur transition hover:bg-white hover:-translate-y-0.5"
          >
            <span className="text-base">←</span>
            Back
          </Link>
        </div>

        {/* Brand */}
        <header className="mt-7 text-center">

          <h1 className="text-[28px] font-bold tracking-[0.04em] text-[#315C55] sm:text-[32px]">
            KAHAANI CHECK
          </h1>

        </header>

        {/* Main illustration */}
        <section className="mt-6 flex justify-center">

          <div className="relative w-full overflow-hidden rounded-[28px]">

            <Image
              src="/onboarding-welcome.jpeg"
              alt="Kahaani-Check weekly voice check-in illustration"
              width={1024}
              height={1024}
              priority
              className="h-auto w-full object-contain"
            />

          </div>

        </section>

        {/* Welcome content */}
        <section className="mt-5 text-center">

          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#315C55]">
            WELCOME
          </p>

          <h2 className="mt-2 text-[30px] font-semibold leading-[1.08] tracking-tight text-[#263331] sm:text-[34px]">
            Your journey of listening
            <br />
            continues
          </h2>

          <p className="mx-auto mt-4 max-w-[390px] text-[15px] leading-6 text-[#687470]">
            We&apos;re here to help you hear the subtle changes
            in your loved one&apos;s voice, over time.
          </p>

        </section>

        {/* CTA */}
        <section className="mt-7">

          <Link
            href="/login"
            className="group flex h-[60px] w-full items-center justify-between rounded-full bg-[#176B5F] px-2 shadow-[0_10px_25px_rgba(23,107,95,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#315C55] hover:shadow-[0_14px_30px_rgba(23,107,95,0.25)] active:scale-[0.98]"
          >

            <span className="ml-6 text-[16px] font-medium text-white">
              Let&apos;s Begin
            </span>

            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#176B5F] shadow-sm transition-transform duration-300 group-hover:scale-105">
              <ArrowRight
                size={20}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>

          </Link>

        </section>

        {/* Small footer */}
        <p className="mt-5 text-center text-[11px] text-[#8A9290]">
          Because every story matters.
        </p>

      </div>

    </main>
  );
}