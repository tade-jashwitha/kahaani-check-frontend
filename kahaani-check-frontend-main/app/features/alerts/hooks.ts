"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/app/lib/api";
import type { Alert } from "./types";

export interface UseAlertsResult {
  alerts: Alert[];
  unreadCount: number;
  loading: boolean;
  resolvingIds: string[];
  error: string | null;
  clearError: () => void;
  resolveAlert: (id: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
}

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [resolvingIds, setResolvingIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await apiFetch("/v1/alerts")) as {
        alerts?: Alert[];
        unread_count?: number;
      };
      if (res && Array.isArray(res.alerts)) {
        // Deduplicate by ID to prevent any duplicate card rendering
        const seen = new Set<string>();
        const uniqueAlerts: Alert[] = [];
        for (const item of res.alerts) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            uniqueAlerts.push(item);
          }
        }
        if (isMountedRef.current) {
          setAlerts(uniqueAlerts);
        }
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    // Auto-refresh periodically so scheduled session notifications update live
    const interval = setInterval(() => {
      fetchAlerts();
    }, 10000);

    const handleAlertsUpdated = () => {
      fetchAlerts();
    };
    window.addEventListener("alerts-updated", handleAlertsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("alerts-updated", handleAlertsUpdated);
    };
  }, [fetchAlerts]);

  const resolveAlert = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;

      // Prevent duplicate in-flight requests
      if (resolvingIds.includes(id)) {
        return false;
      }

      setError(null);
      setResolvingIds((prev) => [...prev, id]);

      // Snapshot prior alerts for rollback if API fails
      let previousAlerts: Alert[] = [];
      setAlerts((prev) => {
        previousAlerts = prev;
        return prev.map((a) => (a.id === id ? { ...a, resolved: true } : a));
      });

      try {
        await apiFetch(`/v1/alerts/${id}/resolve`, {
          method: "PATCH",
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("alerts-updated"));
        }
        return true;
      } catch (err) {
        console.error("Failed to resolve alert:", err);
        // Rollback state immediately on failure
        if (isMountedRef.current) {
          setAlerts(previousAlerts);
          setError("Couldn't update this alert. Please try again.");
        }
        return false;
      } finally {
        if (isMountedRef.current) {
          setResolvingIds((prev) => prev.filter((item) => item !== id));
        }
      }
    },
    [resolvingIds]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const unreadCount = Math.max(0, alerts.filter((a) => !a.resolved).length);

  return {
    alerts,
    unreadCount,
    loading,
    resolvingIds,
    error,
    clearError,
    resolveAlert,
    refreshAlerts: fetchAlerts,
  };
}
