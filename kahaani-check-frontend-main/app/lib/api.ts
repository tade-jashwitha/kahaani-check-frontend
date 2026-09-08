import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  const response = await fetch(`${API_URL}${endpoint}`, {
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