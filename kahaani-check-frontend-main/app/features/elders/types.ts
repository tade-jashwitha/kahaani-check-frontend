/**
 * Elders — shared TypeScript types
 *
 * This is the single source of truth for elder-related types across
 * the frontend.  All pages and components should import from here
 * instead of defining inline interfaces.
 */

export interface Elder {
  id: string;
  caregiver_id: string;
  display_name: string;
  phone_e164: string;
  preferred_call_language: string;
  dob_year_range?: string;
  timezone?: string;
  status: string;
  created_at: string;
}

export interface ElderCreate {
  display_name: string;
  phone_e164: string;
  preferred_call_language: string;
  dob_year_range?: string;
  timezone?: string;
}

export interface ElderUpdate {
  display_name?: string;
  phone_e164?: string;
  preferred_call_language?: string;
  dob_year_range?: string;
  timezone?: string;
  status?: string;
}
