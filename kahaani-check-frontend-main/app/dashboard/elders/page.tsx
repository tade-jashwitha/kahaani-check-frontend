"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Home,
  Leaf,
  Lightbulb,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import Avatar from "@/app/components/ui/Avatar";
import { apiFetch } from "@/app/lib/api";

type ElderStatus = "active";

export interface Elder {
  id: string;
  name: string;
  phone: string;
  preferredCallLanguage: string;
  dobYearRange: string | null;
  timezone: string;
  status: ElderStatus;
  createdAt: string;
}

type FilterKey = "all" | "active";

const filters: {
  key: FilterKey;
  label: string;
}[] = [
  {
    key: "all",
    label: "All",
  },
  {
    key: "active",
    label: "Active",
  },
];

interface BackendElder {
  id: string;
  caregiver_id: string;
  display_name: string;
  phone_e164: string;
  preferred_call_language: string;
  dob_year_range: string | null;
  timezone: string;
  status: string;
  created_at: string;
}

export default function EldersPage() {
  const [elders, setElders] = useState<Elder[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<FilterKey>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadElders() {
      try {
        setLoading(true);
        setError("");

        const data = await apiFetch("/v1/elders");

        if (!Array.isArray(data)) {
          throw new Error(
            "Unexpected response received from the backend."
          );
        }

        const mappedElders: Elder[] = (
          data as BackendElder[]
        ).map((elder) => ({
          id: elder.id,
          name: elder.display_name,
          phone: elder.phone_e164,
          preferredCallLanguage:
            elder.preferred_call_language,
          dobYearRange: elder.dob_year_range,
          timezone: elder.timezone,
          status: "active",
          createdAt: elder.created_at,
        }));

        setElders(mappedElders);
      } catch (err) {
        console.error("Failed to load elders:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load elders."
        );
      } finally {
        setLoading(false);
      }
    }

    loadElders();
  }, []);

  const filteredElders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return elders.filter((elder) => {
      const matchesSearch =
        query === "" ||
        elder.name.toLowerCase().includes(query) ||
        elder.phone.toLowerCase().includes(query);

      const matchesFilter =
        activeFilter === "all" ||
        elder.status === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter, elders]);

  function getFilterCount(filter: FilterKey) {
    if (filter === "all") {
      return elders.length;
    }

    return elders.filter(
      (elder) => elder.status === filter
    ).length;
  }

  const hasElders = elders.length > 0;

  return (
    <main className="min-h-screen bg-background text-text-primary">
      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside
        className="
          fixed
          left-0
          top-0
          hidden
          h-screen
          w-[250px]
          flex-col
          border-r
          border-border
          bg-surface
          lg:flex
        "
      >
        {/* BRAND */}

        <div
          className="
            border-b
            border-border
            px-6
            py-6
          "
        >
          <Link
            href="/dashboard"
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-primary-light
              "
            >
              <Leaf
                className="
                  h-5
                  w-5
                  -rotate-[15deg]
                  text-primary
                "
              />
            </div>

            <div>
              <p
                className="
                  font-bold
                  text-foreground
                "
              >
                Kahaani-Check
              </p>

              <p
                className="
                  text-[11px]
                  text-text-muted
                "
              >
                Because every story matters
              </p>
            </div>
          </Link>
        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 space-y-1.5 p-4">
          <DesktopNavItem
            href="/dashboard"
            icon={<Home className="h-5 w-5" />}
            label="Dashboard"
          />

          <DesktopNavItem
            href="/dashboard/elders"
            icon={<Users className="h-5 w-5" />}
            label="Elders"
            active
          />

          <DesktopNavItem
            href="/dashboard/elders"
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Check-ins"
          />

          <DesktopNavItem
            href="/dashboard/elders"
            icon={<Lightbulb className="h-5 w-5" />}
            label="Insights"
          />

          <DesktopNavItem
            href="/dashboard/settings"
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
          />
        </nav>

        {/* MESSAGE */}

        <div
          className="
            border-t
            border-border
            p-5
          "
        >
          <div
            className="
              rounded-2xl
              bg-[#F7EFE1]
              p-4
            "
          >
            <p
              className="
                text-sm
                font-semibold
                text-foreground
              "
            >
              Small moments matter.
            </p>

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-text-muted
              "
            >
              Every conversation helps you
              stay connected.
            </p>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <div className="lg:ml-[250px]">
        {/* HEADER */}

        <header
          className="
            sticky
            top-0
            z-30
            border-b
            border-border
            bg-background/95
            backdrop-blur
          "
        >
          <div
            className="
              mx-auto
              flex
              h-[62px]
              max-w-5xl
              items-center
              justify-between
              px-4
              sm:px-7
            "
          >
            {/* MOBILE BRAND */}

            <Link
              href="/dashboard"
              className="
                flex
                items-center
                gap-2.5
                lg:hidden
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary-light
                "
              >
                <Leaf
                  className="
                    h-4
                    w-4
                    -rotate-[15deg]
                    text-primary
                  "
                />
              </div>

              <p
                className="
                  text-sm
                  font-bold
                  text-foreground
                "
              >
                Kahaani-Check
              </p>
            </Link>

            {/* DESKTOP TITLE */}

            <div className="hidden lg:block">
              <p
                className="
                  text-xs
                  text-text-muted
                "
              >
                Dashboard / Elders
              </p>

              <p
                className="
                  text-sm
                  font-semibold
                  text-foreground
                "
              >
                Your loved ones
              </p>
            </div>

            {/* NOTIFICATIONS */}

            <button
              type="button"
              aria-label="Notifications"
              className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                text-text-secondary
                transition
                hover:bg-primary-light
              "
            >
              <Bell className="h-5 w-5" />

              <span
                className="
                  absolute
                  right-2
                  top-2
                  h-2
                  w-2
                  rounded-full
                  bg-[#C97862]
                "
              />
            </button>
          </div>
        </header>

        {/* CONTENT */}

        <div
          className="
            mx-auto
            max-w-5xl
            px-4
            pb-28
            pt-7
            sm:px-7
            sm:pt-9
            lg:pb-12
          "
        >
          {/* TITLE */}

          <div
            className="
              flex
              items-end
              justify-between
              gap-4
            "
          >
            <div>
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-primary
                "
              >
                People you care about
              </p>

              <h1
                className="
                  mt-1.5
                  text-[30px]
                  font-bold
                  tracking-tight
                  text-foreground
                  sm:text-4xl
                "
              >
                Elders

                <span
                  className="
                    ml-2
                    font-normal
                    text-text-muted
                  "
                >
                  ({elders.length})
                </span>
              </h1>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-secondary
                  sm:text-sm
                "
              >
                Your loved ones
              </p>
            </div>

            {/* DESKTOP ADD */}

            <Link
              href="/dashboard/elders/new"
              className="
                hidden
                min-h-11
                items-center
                gap-2
                rounded-button
                bg-primary
                px-5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-primary-dark
                lg:inline-flex
              "
            >
              <Plus className="h-4 w-4" />
              Add Elder
            </Link>
          </div>

          {/* SEARCH */}

          <div className="mt-5">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  left-3.5
                  top-1/2
                  h-[17px]
                  w-[17px]
                  -translate-y-1/2
                  text-text-muted
                "
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by name..."
                aria-label="Search elders by name"
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-border
                  bg-surface
                  pl-10
                  pr-4
                  text-xs
                  text-text-primary
                  outline-none
                  placeholder:text-text-muted
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary-light
                "
              />
            </div>
          </div>

          {/* FILTERS */}

          <div
            className="
              mt-3
              flex
              gap-2
              overflow-x-auto
              pb-1
            "
          >
            {filters.map((filter) => {
              const active =
                activeFilter === filter.key;

              const count =
                getFilterCount(filter.key);

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() =>
                    setActiveFilter(filter.key)
                  }
                  className={`
                    shrink-0
                    rounded-full
                    border
                    px-3.5
                    py-1.5
                    text-[10px]
                    font-semibold
                    transition

                    ${
                      active
                        ? `
                          border-primary
                          bg-primary
                          text-white
                        `
                        : `
                          border-border
                          bg-surface
                          text-text-secondary
                          hover:border-primary/30
                          hover:bg-primary-light
                        `
                    }
                  `}
                >
                  {filter.label} {count}
                </button>
              );
            })}
          </div>

          {/* =================================================
              ELDER LIST
          ================================================== */}

          <section className="mt-5">
            <div
              className="
                overflow-hidden
                rounded-[16px]
                border
                border-border
                bg-surface
                shadow-card
              "
            >
              {/* LOADING */}

              {loading ? (
                <div className="px-6 py-14 text-center">
                  <div
                    className="
                      mx-auto
                      h-8
                      w-8
                      animate-spin
                      rounded-full
                      border-2
                      border-primary-light
                      border-t-primary
                    "
                  />

                  <p
                    className="
                      mt-4
                      text-sm
                      font-medium
                      text-text-primary
                    "
                  >
                    Loading your family members...
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-text-muted
                    "
                  >
                    Connecting securely to your account.
                  </p>
                </div>
              ) : error ? (
                /* ERROR */

                <div
                  className="
                    px-6
                    py-14
                    text-center
                  "
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-2xl
                      bg-[#F7EFE1]
                    "
                  >
                    <Users
                      className="
                        h-6
                        w-6
                        text-primary
                      "
                    />
                  </div>

                  <h2
                    className="
                      mt-5
                      text-base
                      font-semibold
                      text-foreground
                    "
                  >
                    We couldn&apos;t load your elders
                  </h2>

                  <p
                    className="
                      mx-auto
                      mt-2
                      max-w-sm
                      text-xs
                      leading-5
                      text-text-muted
                    "
                  >
                    {error}
                  </p>
                </div>
              ) : filteredElders.length > 0 ? (
                /* ELDER LIST */

                <div className="divide-y divide-border">
                  {filteredElders.map((elder) => {
                    return (
                      <Link
                        key={elder.id}
                        href={`/dashboard/elders/${elder.id}`}
                        className="
                          group
                          flex
                          min-h-[72px]
                          items-center
                          gap-3
                          px-3
                          py-3
                          transition
                          hover:bg-[#F7FAF8]
                          active:bg-primary-light/40
                          sm:px-5
                        "
                      >
                        {/* AVATAR */}

                        <Avatar
                          name={elder.name}
                          size="md"
                        />

                        {/* INFORMATION */}

                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <h2
                            className="
                              truncate
                              text-xs
                              font-semibold
                              text-text-primary
                              sm:text-sm
                            "
                          >
                            {elder.name}
                          </h2>

                          <p
                            className="
                              mt-0.5
                              text-[10px]
                              text-text-muted
                              sm:text-xs
                            "
                          >
                            {elder.dobYearRange
                              ? `Age range: ${elder.dobYearRange}`
                              : "Age range not provided"}{" "}
                            •{" "}
                            {elder.preferredCallLanguage
                              .toUpperCase()}
                          </p>

                          <p
                            className="
                              mt-0.5
                              hidden
                              text-[10px]
                              text-text-muted
                              sm:block
                            "
                          >
                            Timezone: {elder.timezone}
                          </p>
                        </div>

                        {/* STATUS */}

                        <div
                          className="
                            flex
                            shrink-0
                            items-center
                            gap-1.5
                          "
                        >
                          <div className="hidden sm:block">
                            <span
                              className="
                                rounded-full
                                bg-primary-light
                                px-2.5
                                py-1
                                text-[10px]
                                font-semibold
                                text-primary
                              "
                            >
                              Active
                            </span>
                          </div>

                          <span
                            className="
                              rounded-full
                              bg-primary-light
                              px-2
                              py-1
                              text-[8px]
                              font-semibold
                              text-primary
                              sm:hidden
                            "
                          >
                            Active
                          </span>

                          <ChevronRight
                            className="
                              h-4
                              w-4
                              text-text-muted
                              transition
                              group-hover:translate-x-0.5
                              group-hover:text-primary
                            "
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                /* EMPTY STATE */

                <div
                  className="
                    px-6
                    py-14
                    text-center
                  "
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-2xl
                      bg-primary-light
                    "
                  >
                    <Users
                      className="
                        h-6
                        w-6
                        text-primary
                      "
                    />
                  </div>

                  <h2
                    className="
                      mt-5
                      text-base
                      font-semibold
                      text-foreground
                    "
                  >
                    {hasElders
                      ? "No elders found"
                      : "No elders added yet"}
                  </h2>

                  <p
                    className="
                      mx-auto
                      mt-2
                      max-w-sm
                      text-xs
                      leading-5
                      text-text-muted
                    "
                  >
                    {hasElders
                      ? "Try another name or filter."
                      : "Add a family member to begin gentle check-ins and keep their conversations organized."}
                  </p>

                  {!hasElders && (
                    <Link
                      href="/dashboard/elders/new"
                      className="
                        mt-6
                        inline-flex
                        min-h-11
                        items-center
                        justify-center
                        gap-2
                        rounded-button
                        bg-primary
                        px-5
                        text-xs
                        font-bold
                        text-white
                        shadow-sm
                        transition
                        hover:bg-primary-dark
                        active:scale-[0.99]
                      "
                    >
                      <Plus className="h-4 w-4" />
                      Add Elder
                    </Link>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* CONNECTION NOTE */}

          <div
            className="
              mt-6
              rounded-2xl
              border
              border-[#DDE9E5]
              bg-[#F3F8F6]
              px-5
              py-5
            "
          >
            <p
              className="
                text-sm
                font-medium
                text-primary
              "
            >
              Your family data is connected
            </p>

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-text-secondary
              "
            >
              Elder profiles are securely loaded
              from your Kahaani-Check backend.
            </p>
          </div>

          {/* MOBILE ADD */}

          <Link
            href="/dashboard/elders/new"
            className="
              mt-4
              flex
              min-h-12
              w-full
              items-center
              justify-center
              gap-2
              rounded-button
              bg-primary
              px-5
              text-xs
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-primary-dark
              active:scale-[0.99]
              lg:hidden
            "
          >
            <Plus className="h-4 w-4" />
            Add Elder
          </Link>

          {/* FOOTER */}

          <p
            className="
              mt-3
              text-center
              text-[9px]
              text-text-muted
            "
          >
            Your conversations are here to help
            you stay connected.
          </p>
        </div>

        {/* MOBILE BOTTOM NAV */}

        <nav
          className="
            fixed
            bottom-0
            left-0
            right-0
            z-40
            border-t
            border-border
            bg-surface/95
            backdrop-blur
            lg:hidden
          "
        >
          <div
            className="
              mx-auto
              grid
              h-[68px]
              max-w-[480px]
              grid-cols-5
            "
          >
            <MobileNavItem
              href="/dashboard"
              icon={<Home className="h-[19px] w-[19px]" />}
              label="Home"
            />

            <MobileNavItem
              href="/dashboard/elders"
              icon={<Users className="h-[19px] w-[19px]" />}
              label="Elders"
              active
            />

            <MobileNavItem
              href="/dashboard/elders"
              icon={
                <ShieldCheck className="h-[19px] w-[19px]" />
              }
              label="Check-ins"
            />

            <MobileNavItem
              href="/dashboard/elders"
              icon={
                <Lightbulb className="h-[19px] w-[19px]" />
              }
              label="Insights"
            />

            <MobileNavItem
              href="/dashboard/settings"
              icon={
                <Settings className="h-[19px] w-[19px]" />
              }
              label="More"
            />
          </div>
        </nav>
      </div>
    </main>
  );
}

/* ============================================================
   DESKTOP NAVIGATION ITEM
============================================================ */

function DesktopNavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        flex
        items-center
        gap-3
        rounded-xl
        px-4
        py-3
        text-sm
        transition

        ${
          active
            ? `
              bg-primary-light
              font-semibold
              text-primary
            `
            : `
              font-medium
              text-text-secondary
              hover:bg-primary-light
              hover:text-primary
            `
        }
      `}
    >
      {icon}
      {label}
    </Link>
  );
}

/* ============================================================
   MOBILE NAVIGATION ITEM
============================================================ */

function MobileNavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        flex
        flex-col
        items-center
        justify-center
        gap-1
        transition

        ${
          active
            ? "text-primary"
            : "text-text-muted hover:text-primary"
        }
      `}
    >
      <span
        className={`
          flex
          h-7
          w-7
          items-center
          justify-center
          rounded-lg

          ${
            active
              ? "bg-primary-light"
              : "bg-transparent"
          }
        `}
      >
        {icon}
      </span>

      <span
        className={`
          text-[9px]

          ${
            active
              ? "font-bold"
              : "font-medium"
          }
        `}
      >
        {label}
      </span>
    </Link>
  );
}