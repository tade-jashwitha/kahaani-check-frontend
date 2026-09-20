/**
 * Elders — API functions
 *
 * All /v1/elders fetch calls live here.
 * Pages and hooks import from this module; they never call apiFetch directly.
 */

import { apiFetch } from "@/app/lib/api";
import type { Elder, ElderCreate, ElderUpdate } from "./types";

/**
 * Fetch all elders belonging to the authenticated caregiver.
 */
export async function listElders(): Promise<Elder[]> {
  const data = await apiFetch("/v1/elders");
  // API may return an array directly or { elders: [...] }
  return (Array.isArray(data) ? data : (data as { elders?: Elder[] })?.elders ?? []) as Elder[];
}

/**
 * Fetch a single elder by ID.
 */
export async function getElder(elderId: string): Promise<Elder> {
  return apiFetch(`/v1/elders/${elderId}`);
}

/**
 * Create a new elder under the authenticated caregiver.
 */
export async function createElder(body: ElderCreate): Promise<Elder> {
  return apiFetch("/v1/elders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Partially update an existing elder.
 */
export async function updateElder(
  elderId: string,
  body: ElderUpdate
): Promise<Elder> {
  return apiFetch(`/v1/elders/${elderId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
