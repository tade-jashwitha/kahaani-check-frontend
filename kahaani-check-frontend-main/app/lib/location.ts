/**
 * Real Location and Timezone Detection Utility for Kahaani-Check
 */

export interface UserLocationInfo {
  timezone: string;
  city?: string;
  country?: string;
  formattedLocation: string;
  offset: string;
}

/**
 * Detect the authentic system/browser timezone.
 */
export function getUserTimezone(): string {
  try {
    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    }
  } catch {
    // fallback
  }
  return "UTC";
}

/**
 * Get formatted UTC offset for a given timezone, e.g. "GMT+5:30" or "GMT-4:00".
 */
export function getTimezoneOffset(timeZone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    if (offsetPart?.value) {
      return offsetPart.value;
    }
  } catch {
    // fallback
  }
  return "UTC";
}

/**
 * Format timezone into a clean, human-friendly name.
 * Specifically converts "Asia/Kolkata" -> "Indian Standard Time (IST)" without raw "Asia/Kolkata".
 */
export function formatFriendlyTimezone(tz: string | undefined | null): string {
  if (!tz) return "Indian Standard Time (IST)";
  const normalized = tz.trim();
  if (
    normalized === "Asia/Kolkata" ||
    normalized === "Asia/Calcutta" ||
    normalized.toLowerCase().includes("kolkata") ||
    normalized.toLowerCase().includes("calcutta") ||
    normalized === "IST"
  ) {
    return "Indian Standard Time (IST)";
  }
  if (normalized === "UTC" || normalized === "Etc/UTC") {
    return "UTC (GMT+0)";
  }
  if (normalized === "America/New_York") {
    return "Eastern Time (US & Canada)";
  }
  if (normalized === "America/Chicago") {
    return "Central Time (US & Canada)";
  }
  if (normalized === "America/Los_Angeles") {
    return "Pacific Time (US & Canada)";
  }
  if (normalized === "Europe/London") {
    return "London (GMT / BST)";
  }
  if (normalized === "Asia/Dubai") {
    return "Gulf Standard Time (GST)";
  }
  if (normalized === "Asia/Singapore") {
    return "Singapore Time (SGT)";
  }

  const parts = normalized.split("/");
  const city = parts[parts.length - 1]?.replace(/_/g, " ");
  return city || normalized;
}

/**
 * Human-friendly name from IANA timezone string.
 * Example: "America/New_York" -> "New York (America/New_York)"
 */
export function formatTimezoneDisplay(tz: string): string {
  try {
    const offset = getTimezoneOffset(tz);
    const friendly = formatFriendlyTimezone(tz);
    return `${friendly} (${offset})`;
  } catch {
    return tz;
  }
}

/**
 * Quick synchronous real location summary from browser's locale and timezone.
 */
export function getInitialUserLocation(): UserLocationInfo {
  const tz = getUserTimezone();
  const offset = getTimezoneOffset(tz);
  const parts = tz.split("/");
  const city = parts[parts.length - 1]?.replace(/_/g, " ") || tz;

  return {
    timezone: tz,
    city,
    formattedLocation: `${city} (${offset})`,
    offset,
  };
}

/**
 * Asynchronously request exact GPS position and reverse-geocode to real city & country.
 */
export async function detectPreciseGpsLocation(): Promise<UserLocationInfo> {
  const fallback = getInitialUserLocation();

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return fallback;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            {
              headers: {
                "Accept-Language": "en",
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            const address = data.address || {};
            const city =
              address.city ||
              address.town ||
              address.village ||
              address.county ||
              address.state;
            const country = address.country;
            const formatted = [city, country].filter(Boolean).join(", ");
            const tz = getUserTimezone();
            const offset = getTimezoneOffset(tz);

            resolve({
              timezone: tz,
              city,
              country,
              formattedLocation: formatted || fallback.formattedLocation,
              offset,
            });
            return;
          }
        } catch {
          // GPS reverse-geocode network error or rate limit, fall back gracefully
        }
        resolve(fallback);
      },
      () => {
        // User denied geolocation or error, use system timezone fallback
        resolve(fallback);
      },
      { timeout: 8000 }
    );
  });
}

/**
 * Curated list of standard global timezones, with user's detected timezone at the very top.
 */
export function getStandardTimezones(): { value: string; label: string }[] {
  const userTz = getUserTimezone();
  const list = [
    userTz,
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Vancouver",
    "America/Sao_Paulo",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "Europe/Rome",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Asia/Hong_Kong",
    "Australia/Sydney",
    "Australia/Melbourne",
    "Pacific/Auckland",
    "UTC",
  ];

  const unique = Array.from(new Set(list));
  return unique.map((tz) => ({
    value: tz,
    label: tz === userTz ? `📍 ${formatTimezoneDisplay(tz)} (Your Detected Location)` : formatTimezoneDisplay(tz),
  }));
}
