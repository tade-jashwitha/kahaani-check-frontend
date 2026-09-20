/**
 * Alerts — shared TypeScript types
 *
 * Alerts are surfaced when a longitudinal trajectory status
 * changes to something worth attention.
 * Currently frontend-only until the backend adds push-style alerts.
 */

export type AlertSeverity = "amber" | "red";

export interface Alert {
  id: string;
  elder_id: string;
  elder_name: string;
  severity: AlertSeverity;
  message: string;
  detail?: string;
  created_at: string;
  resolved: boolean;
  /** Links to the check-in that triggered this alert */
  checkin_id?: string;
}
