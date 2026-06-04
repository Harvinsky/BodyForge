"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppUser } from "@/hooks/use-app-user";
import type { CalendarEvent } from "@/lib/types";

const CALENDAR_FETCH_MS = 20_000;

interface UseCalendarResult {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  configured: boolean;
  needsLogin: boolean;
  refetch: () => Promise<void>;
}

export function useCalendar(): UseCalendarResult {
  const { userId, authReady } = useAppUser();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!authReady) return;

    if (!userId) {
      setEvents([]);
      setNeedsLogin(true);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNeedsLogin(false);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CALENDAR_FETCH_MS);

    try {
      const response = await fetch("/api/calendar", {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json();

      if (response.status === 401) {
        setEvents([]);
        setNeedsLogin(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Nepodarilo sa načítať kalendár");
      }

      setEvents(data.events ?? []);
      setConfigured(data.configured ?? true);
      if (data.error && typeof data.error === "string") {
        setError(data.error);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Kalendár — pomalé pripojenie, skús obnoviť");
      } else {
        setError(err instanceof Error ? err.message : "Neznáma chyba");
      }
      setEvents([]);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [authReady, userId]);

  useEffect(() => {
    void fetchEvents();
    if (!userId) return;
    const interval = setInterval(() => void fetchEvents(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents, userId]);

  return {
    events,
    loading,
    error,
    configured,
    needsLogin,
    refetch: fetchEvents,
  };
}
