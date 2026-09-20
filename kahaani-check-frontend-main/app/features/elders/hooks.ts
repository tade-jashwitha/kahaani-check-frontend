"use client";

/**
 * Elders — React hooks
 *
 * Encapsulates loading, error, and data state for elder-related data.
 * Pages import hooks from here instead of managing state manually.
 */

import { useEffect, useState } from "react";
import { listElders, getElder } from "./api";
import type { Elder } from "./types";

export interface UseEldersResult {
  elders: Elder[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to load all elders for the authenticated caregiver.
 */
export function useElders(): UseEldersResult {
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listElders();
        if (!cancelled) setElders(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load elders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick]);

  return {
    elders,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}

export interface UseElderResult {
  elder: Elder | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to load a single elder by ID.
 */
export function useElder(elderId: string | null): UseElderResult {
  const [elder, setElder] = useState<Elder | null>(null);
  const [loading, setLoading] = useState(!!elderId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!elderId) {
      setElder(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getElder(elderId!);
        if (!cancelled) setElder(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load elder");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [elderId]);

  return { elder, loading, error };
}
