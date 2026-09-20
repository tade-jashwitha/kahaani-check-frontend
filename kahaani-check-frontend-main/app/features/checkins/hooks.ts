"use client";

/**
 * Check-ins — React hooks
 *
 * Encapsulates loading, error, and data state for check-in data.
 */

import { useEffect, useState } from "react";
import { listCheckins } from "./api";
import type { CheckIn } from "./types";

export interface UseCheckinsResult {
  checkins: CheckIn[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to load all check-ins for a given elder.
 */
export function useCheckins(elderId: string | null): UseCheckinsResult {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(!!elderId);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!elderId) {
      setCheckins([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listCheckins(elderId!);
        if (!cancelled) setCheckins(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load check-ins");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [elderId, tick]);

  return {
    checkins,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
