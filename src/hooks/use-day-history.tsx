"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { format } from "date-fns";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/fetch-timeout";
import { useAppUser } from "@/hooks/use-app-user";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { getEffectiveWeightKg, formatProgramDateShort } from "@/lib/body-goal";
import { mealKeyShort } from "@/lib/i18n/calories-ui";
import { useI18n } from "@/providers/locale-provider";
import {
  clearLocalDayData,
  clearLocalDayRange,
  deleteDayFromSupabase,
  deleteDayRangeFromSupabase,
} from "@/lib/clear-day-data";
import {
  countDaysWithData,
  datesInRange,
  fetchDayHistory,
  historyRangeDayCount,
  type DayHistoryRecord,
} from "@/lib/day-history";
import {
  dayHistoryChangedIncludesToday,
  notifyDayHistoryChanged,
} from "@/lib/day-history-events";
import {
  buildCurrentProgramPeriod,
  buildCustomRangePeriod,
  clampRangeEnd,
  CURRENT_PROGRAM_ID,
  CUSTOM_RANGE_ID,
  loadLocalProgramPeriods,
  rowToProgramPeriod,
  saveLocalProgramPeriods,
  formatHistoryDayLabel,
  type ProgramPeriod,
} from "@/lib/program-periods";
import { useHistoryStepsBackfill } from "@/hooks/use-history-steps-backfill";

interface DayHistoryContextValue {
  days: DayHistoryRecord[];
  loading: boolean;
  error: string | null;
  periods: ProgramPeriod[];
  selectedPeriodId: string;
  customStart: string;
  customEnd: string;
  activePeriod: ProgramPeriod | null;
  daysWithData: number;
  totalDaysInRange: number;
  setSelectedPeriodId: (id: string) => void;
  setCustomStart: (v: string) => void;
  setCustomEnd: (v: string) => void;
  refresh: () => Promise<void>;
  canArchiveCurrentProgram: boolean;
  archiveCurrentProgram: (
    label: string
  ) => Promise<
    | { ok: true; synced: boolean; label: string }
    | { ok: false; reason: "empty_label" | "no_program" }
  >;
  deleteDay: (dateStr: string) => Promise<boolean>;
  deleteVisibleRange: () => Promise<boolean>;
  deleteArchivedPeriod: (periodId: string, deleteData: boolean) => Promise<boolean>;
}

const DayHistoryContext = createContext<DayHistoryContextValue | null>(null);

export function DayHistoryProvider({ children }: { children: React.ReactNode }) {
  const { userId, authReady } = useAppUser();
  const { settings } = useBodyGoal();
  const { t, locale } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const today = format(new Date(), "yyyy-MM-dd");

  const [days, setDays] = useState<DayHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivedPeriods, setArchivedPeriods] = useState<ProgramPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(CURRENT_PROGRAM_ID);
  const [customStart, setCustomStart] = useState(settings.programStartDate ?? "");
  const [customEnd, setCustomEnd] = useState(today);

  const currentPeriod = useMemo((): ProgramPeriod => {
    const base = buildCurrentProgramPeriod(
      settings.programStartDate,
      settings.goalDate,
      today
    );
    if (!settings.programStartDate || !settings.goalDate) {
      return { ...base, label: t("history.noProgram") };
    }
    return {
      ...base,
      label: t("history.currentProgram", {
        start: formatProgramDateShort(settings.programStartDate, locale),
        end: formatProgramDateShort(settings.goalDate, locale),
      }),
    };
  }, [settings.programStartDate, settings.goalDate, today, t, locale]);

  const periods = useMemo(
    () => [currentPeriod, ...archivedPeriods],
    [currentPeriod, archivedPeriods]
  );

  const activePeriod = useMemo((): ProgramPeriod | null => {
    if (selectedPeriodId === CURRENT_PROGRAM_ID) return currentPeriod;
    if (selectedPeriodId === CUSTOM_RANGE_ID) {
      const start = customStart || settings.programStartDate || today;
      const end = clampRangeEnd(
        start,
        customEnd || today,
        today
      );
      return {
        ...buildCustomRangePeriod(start, end),
        label: t("history.customRangeLabel", {
          start: formatProgramDateShort(start, locale),
          end: formatProgramDateShort(end, locale),
        }),
      };
    }
    return archivedPeriods.find((p) => p.id === selectedPeriodId) ?? currentPeriod;
  }, [
    selectedPeriodId,
    currentPeriod,
    customStart,
    customEnd,
    today,
    settings.programStartDate,
    archivedPeriods,
    locale,
    t,
  ]);

  const loadPeriods = useCallback(async () => {
    const local = loadLocalProgramPeriods(userId);

    if (userId && isSupabaseConfigured()) {
      const { data, error: fetchError } = await withTimeout(
        supabase
          .from("program_periods")
          .select("*")
          .eq("user_id", userId)
          .order("start_date", { ascending: false }),
        8_000
      ).catch(() => ({ data: null, error: { message: "timeout" } }));

      if (!fetchError && data) {
        const remote = data.map((row) => rowToProgramPeriod(row));
        const remoteIds = new Set(remote.map((p) => p.id));
        const localOnly = local.filter(
          (p) => p.id.startsWith("local-") && !remoteIds.has(p.id)
        );
        setArchivedPeriods([...remote, ...localOnly]);
        return;
      }
    }

    setArchivedPeriods(local);
  }, [supabase, userId]);

  const refresh = useCallback(async () => {
    if (!authReady || !activePeriod) return;

    setLoading(true);
    setError(null);

    try {
      const start = activePeriod.startDate;
      const end = clampRangeEnd(activePeriod.startDate, activePeriod.endDate, today);
      const calorieTarget =
        activePeriod.dailyCalorieTarget ?? settings.dailyCalorieTarget ?? 0;
      const weightKg = getEffectiveWeightKg(settings) ?? 0;

      const records = await fetchDayHistory(
        supabase,
        userId,
        start,
        end,
        calorieTarget,
        weightKg,
        today
      );
      setDays(
        records.map((record) => ({
          ...record,
          dateLabel: formatHistoryDayLabel(record.date, locale),
          trainingSummary:
            record.trainingSessions.length === 0
              ? t("history.noTraining")
              : record.trainingSummary,
          mealGroups: record.mealGroups.map((group) => ({
            ...group,
            label:
              group.mealKey != null
                ? mealKeyShort(group.mealKey, t)
                : t("calories.otherMeals"),
          })),
        }))
      );
    } catch {
      setError(t("history.loadError"));
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [
    authReady,
    activePeriod,
    supabase,
    userId,
    settings.dailyCalorieTarget,
    settings.currentWeightKg,
    settings.startWeightKg,
    today,
    locale,
    t,
  ]);

  useEffect(() => {
    if (authReady) void loadPeriods();
  }, [authReady, loadPeriods]);

  useEffect(() => {
    if (authReady && activePeriod) void refresh();
  }, [authReady, activePeriod, refresh]);

  const historyRangeEnd = activePeriod
    ? clampRangeEnd(activePeriod.startDate, activePeriod.endDate, today)
    : undefined;

  useHistoryStepsBackfill(
    supabase,
    userId,
    authReady,
    activePeriod?.startDate,
    historyRangeEnd,
    getEffectiveWeightKg(settings) ?? 0,
    refresh
  );

  useEffect(() => {
    setCustomStart(settings.programStartDate ?? "");
  }, [settings.programStartDate]);

  const persistLocalPeriods = useCallback(
    (next: ProgramPeriod[]) => {
      saveLocalProgramPeriods(userId, next);
      setArchivedPeriods(next);
    },
    [userId]
  );

  const archiveCurrentProgram = useCallback(
    async (
      label: string
    ): Promise<
      | { ok: true; synced: boolean; label: string }
      | { ok: false; reason: "empty_label" | "no_program" }
    > => {
      const trimmed = label.trim();
      if (!trimmed) return { ok: false, reason: "empty_label" };
      if (!settings.programStartDate || !settings.goalDate) {
        return { ok: false, reason: "no_program" };
      }

      const end = clampRangeEnd(
        settings.programStartDate,
        settings.goalDate < today ? settings.goalDate : today,
        today
      );
      const payload = {
        label: trimmed,
        start_date: settings.programStartDate,
        end_date: end,
        daily_calorie_target: settings.dailyCalorieTarget,
        start_weight_kg: settings.startWeightKg,
        goal_weight_kg: settings.goalWeightKg,
      };

      const localPeriod: ProgramPeriod = {
        id: `local-${Date.now()}`,
        label: trimmed,
        startDate: payload.start_date,
        endDate: payload.end_date,
        dailyCalorieTarget: payload.daily_calorie_target,
        startWeightKg: payload.start_weight_kg,
        goalWeightKg: payload.goal_weight_kg,
        createdAt: new Date().toISOString(),
      };

      if (userId && isSupabaseConfigured()) {
        const { data, error: insertError } = await supabase
          .from("program_periods")
          .insert({ ...payload, user_id: userId })
          .select("*")
          .single();

        if (!insertError && data) {
          await loadPeriods();
          setSelectedPeriodId(String(data.id));
          return { ok: true, synced: true, label: trimmed };
        }
      }

      persistLocalPeriods([localPeriod, ...loadLocalProgramPeriods(userId)]);
      setSelectedPeriodId(localPeriod.id);
      return { ok: true, synced: false, label: trimmed };
    },
    [
      settings,
      today,
      userId,
      supabase,
      loadPeriods,
      persistLocalPeriods,
    ]
  );

  const deleteDay = useCallback(
    async (dateStr: string): Promise<boolean> => {
      if (userId && isSupabaseConfigured()) {
        await deleteDayFromSupabase(supabase, userId, dateStr);
      }
      clearLocalDayData(userId, dateStr);
      notifyDayHistoryChanged([dateStr]);
      await refresh();
      return true;
    },
    [userId, supabase, refresh]
  );

  const deleteVisibleRange = useCallback(async (): Promise<boolean> => {
    if (!activePeriod) return false;
    const start = activePeriod.startDate;
    const end = clampRangeEnd(
      activePeriod.startDate,
      activePeriod.endDate,
      today
    );
    const dateList = datesInRange(start, end);

    if (userId && isSupabaseConfigured()) {
      await deleteDayRangeFromSupabase(supabase, userId, start, end);
    }
    clearLocalDayRange(userId, dateList);
    notifyDayHistoryChanged(dateList);
    await refresh();
    return true;
  }, [activePeriod, userId, supabase, today, refresh]);

  const deleteArchivedPeriod = useCallback(
    async (periodId: string, deleteData: boolean): Promise<boolean> => {
      const period = archivedPeriods.find((p) => p.id === periodId);
      if (!period) return false;

      const dateList = datesInRange(period.startDate, period.endDate);

      if (deleteData) {
        if (userId && isSupabaseConfigured()) {
          await deleteDayRangeFromSupabase(
            supabase,
            userId,
            period.startDate,
            period.endDate
          );
        }
        clearLocalDayRange(userId, dateList);
        notifyDayHistoryChanged(dateList);
      }

      if (userId && isSupabaseConfigured() && !periodId.startsWith("local-")) {
        await supabase
          .from("program_periods")
          .delete()
          .eq("id", periodId)
          .eq("user_id", userId);
      }

      const next = loadLocalProgramPeriods(userId).filter(
        (p) => p.id !== periodId
      );
      persistLocalPeriods(next);

      if (selectedPeriodId === periodId) {
        setSelectedPeriodId(CURRENT_PROGRAM_ID);
      }
      await loadPeriods();
      return true;
    },
    [
      archivedPeriods,
      userId,
      supabase,
      persistLocalPeriods,
      selectedPeriodId,
      loadPeriods,
    ]
  );

  const totalDaysInRange = activePeriod
    ? historyRangeDayCount(
        activePeriod.startDate,
        clampRangeEnd(activePeriod.startDate, activePeriod.endDate, today)
      )
    : 0;

  const canArchiveCurrentProgram = Boolean(
    settings.programStartDate && settings.goalDate
  );

  const value = useMemo(
    () => ({
      days,
      loading,
      error,
      periods,
      selectedPeriodId,
      customStart,
      customEnd,
      activePeriod,
      daysWithData: countDaysWithData(days),
      totalDaysInRange,
      setSelectedPeriodId,
      setCustomStart,
      setCustomEnd,
      refresh,
      canArchiveCurrentProgram,
      archiveCurrentProgram,
      deleteDay,
      deleteVisibleRange,
      deleteArchivedPeriod,
    }),
    [
      days,
      loading,
      error,
      periods,
      selectedPeriodId,
      customStart,
      customEnd,
      activePeriod,
      totalDaysInRange,
      refresh,
      canArchiveCurrentProgram,
      archiveCurrentProgram,
      deleteDay,
      deleteVisibleRange,
      deleteArchivedPeriod,
    ]
  );

  return (
    <DayHistoryContext.Provider value={value}>
      {children}
    </DayHistoryContext.Provider>
  );
}

export function useDayHistory(): DayHistoryContextValue {
  const ctx = useContext(DayHistoryContext);
  if (!ctx) {
    throw new Error("useDayHistory must be used within DayHistoryProvider");
  }
  return ctx;
}

export { dayHistoryChangedIncludesToday };
