"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import { readStepsForDateRange } from "@/lib/device-steps";
import { backfillStepsForDateRange } from "@/lib/persist-activity-steps";

/**
 * V natívnej Android appke doplní kroky z Health Connect pre dni v zobrazenom období histórie.
 */
export function useHistoryStepsBackfill(
  supabase: SupabaseClient,
  userId: string | null,
  authReady: boolean,
  startDate: string | undefined,
  endDate: string | undefined,
  weightKg: number,
  onUpdated: () => void
): void {
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;
  const lastRangeRef = useRef<string | null>(null);
  const [resyncTick, setResyncTick] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        lastRangeRef.current = null;
        setResyncTick((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!authReady || !startDate || !endDate) return;
    if (!Capacitor.isNativePlatform()) return;

    const rangeKey = `${userId ?? "anon"}:${startDate}:${endDate}:${resyncTick}`;
    if (lastRangeRef.current === rangeKey) return;

    let cancelled = false;

    void (async () => {
      const result = await readStepsForDateRange(startDate, endDate);
      if (cancelled || !result || result.byDate.size === 0) return;

      const updated = await backfillStepsForDateRange(
        supabase,
        userId,
        result.byDate,
        weightKg
      );
      if (!cancelled) {
        lastRangeRef.current = rangeKey;
        if (updated > 0) onUpdatedRef.current();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, endDate, resyncTick, startDate, supabase, userId, weightKg]);
}
