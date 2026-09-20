import { supabase } from "./supabase";

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    // If deployed (e.g. on Render) and NEXT_PUBLIC_API_URL is missing or still localhost:
    if (!isLocalhost && (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      const stored = localStorage.getItem("kahaani_api_url");
      if (stored) return stored;
      return "https://kahaani-check-backend.onrender.com";
    }
  }
  return envUrl || "https://kahaani-check-backend.onrender.com";
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiFetch(
  endpoint: string,
  options: ApiFetchOptions = {}
) {
  let token: string | undefined;

  try {
    const sessionRes = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 1000)
      ),
    ]);
    token = sessionRes?.data?.session?.access_token;
  } catch {
    // Supabase session lookup failed or offline
  }

  if (!token) {
    if (typeof window !== "undefined") {
      token = localStorage.getItem("kahaani_dev_token") || "dev-token";
    } else {
      token = "dev-token";
    }
  }

  const isFormData = options.body instanceof FormData;
  const baseUrl = getApiBaseUrl();

  // Audio processing (Whisper STT + biomarker extraction) or Render cold starts need 60-120 seconds
  const defaultTimeout = (isFormData || endpoint.includes("/audio")) ? 120000 : 60000;
  const timeoutMs = options.timeoutMs ?? defaultTimeout;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        ...(isFormData
          ? {}
          : {
              "Content-Type": "application/json",
            }),

        Authorization: `Bearer ${token}`,

        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `API error ${response.status}: ${
          errorText || response.statusText
        }`
      );
    }

    return response.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Request timed out. The server or AI transcription model is taking longer to respond. If running on Render, the free server may still be waking up — please try again in a moment."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}