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
      return "/api/backend";
    }
  }
  return envUrl || "http://localhost:8000";
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  let token: string | undefined;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token;
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

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,

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
}