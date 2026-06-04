"use client";

import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  lastStepsSyncLabel,
  syncTodayStepsFromDevice,
  type StepSyncSource,
} from "@/lib/device-steps";

export function useDeviceSteps(onSteps: (steps: number) => void) {
  const [syncing, setSyncing] = useState(false);
  const [source, setSource] = useState<StepSyncSource>("stored");
  const [message, setMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncTodayStepsFromDevice();
      if (!result) return;
      setSource(result.source);
      setMessage(result.message);
      setLastSync(lastStepsSyncLabel());
      onSteps(result.steps);
    } finally {
      setSyncing(false);
    }
  }, [onSteps]);

  useEffect(() => {
    setLastSync(lastStepsSyncLabel());
    if (Capacitor.isNativePlatform()) {
      void sync();
    }
  }, [sync]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sync]);

  return { sync, syncing, source, message, lastSync };
}
