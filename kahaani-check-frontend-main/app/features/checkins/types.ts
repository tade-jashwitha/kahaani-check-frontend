/**
 * Check-ins — shared TypeScript types
 *
 * Single source of truth for check-in related types across the frontend.
 */

export interface CheckIn {
  id: string;
  elder_id: string;
  scheduled_for: string;
  status: "scheduled" | "initiated" | "completed" | "technical_failure";
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface StartCheckinResponse {
  success: boolean;
  elder: {
    id: string;
    display_name: string;
  };
  check_in: CheckIn;
}
