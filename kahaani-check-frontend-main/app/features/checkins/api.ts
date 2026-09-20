/**
 * Check-ins — API functions
 *
 * All /v1/check-ins fetch calls live here.
 * Pages and hooks import from this module; they never call apiFetch directly.
 */

import { apiFetch } from "@/app/lib/api";
import type { CheckIn, StartCheckinResponse } from "./types";

/**
 * Start (or retrieve the active) check-in for the given elder.
 */
export async function startCheckin(elderId: string): Promise<StartCheckinResponse> {
  return apiFetch(`/v1/check-ins/elder/${elderId}/start`, {
    method: "POST",
  });
}

/**
 * Fetch all check-ins for the given elder.
 */
export async function listCheckins(elderId: string): Promise<CheckIn[]> {
  return apiFetch(`/v1/check-ins/elder/${elderId}`);
}

/**
 * Fetch a single check-in by ID.
 */
export async function getCheckin(checkInId: string): Promise<{ success: boolean; check_in: CheckIn }> {
  return apiFetch(`/v1/check-ins/${checkInId}`);
}

/**
 * Get the current active check-in (for the caregiver's first elder).
 */
export async function getCurrentCheckin(): Promise<StartCheckinResponse> {
  return apiFetch("/v1/check-ins/current");
}
