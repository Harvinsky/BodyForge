"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { ChevronDown } from "lucide-react";
import {
  CircularGauge,
  type CircularGaugeVariant,
} from "@/components/dashboard/circular-gauge";
import { Card, CardContent } from "@/components/ui/card";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { useCalories } from "@/hooks/use-calories";
import { useHydration } from "@/hooks/use-hydration";
import { useActivitySummary } from "@/hooks/use-activity-summary";
import { getEffectiveWeightKg, getWeightProgressPercent, isBodyGoalConfigured } from "@/lib/body-goal";
import {
  HYDRATION_GOAL_ML,
  HYDRATION_MILESTONE_ML,
  HYDRATION_WEEK_GOAL_ML,
  hydrationGaugeState,
  hydrationOverByMl,
  hydrationProgressPercent,
  mlToLiters,
} from "@/lib/hydration";
import { calculateCompletion, countCompletedTasks } from "@/lib/types";
import { getDaysUntilGoal, getGoalProgressPercent } from "@/lib/goal";
import { burnedPercentOfTarget } from "@/lib/activity-burn";
import { PROTEIN_RATIO } from "@/lib/calories";
import { formatDayCount } from "@/lib/i18n/plural";
import { bcp47Tag } from "@/lib/i18n/detect";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

const GAUGE_MIN = 84;
const GAUGE_MAX_MOBILE = 108;
const GAUGE_MAX_DESKTOP = 96;
// Accounting for: section padding (≤14.4px/side = 28px) + grid gap (≤16px) + cell padding (≤8px/side = 16px)
const SECTION_PAD_PX = 28;
const GRID_GAP_PX = 16;
const CELL_INSET_PX = 16;

function useSidebarGaugeSize(containerRef: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState(GAUGE_MAX_MOBILE);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const mqDesktop = window.matchMedia("(min-width: 1024px)");

    const update = (width: number) => {
      const maxCap = mqDesktop.matches ? GAUGE_MAX_DESKTOP : GAUGE_MAX_MOBILE;
      // Subtract section padding, then split into 2 columns, then subtract cell padding
      const availableForGrid = width - SECTION_PAD_PX;
      const cellWidth = (availableForGrid - GRID_GAP_PX) / 2;
      const next = Math.floor(cellWidth - CELL_INSET_PX);
      setSize(Math.min(maxCap, Math.max(GAUGE_MIN, next)));
    };

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) update(w);
    });

    ro.observe(el);
    const onMq = () => update(el.getBoundingClientRect().width);
    mqDesktop.addEventListener("change", onMq);

    return () => {
      ro.disconnect();
      mqDesktop.removeEventListener("change", onMq);
    };
  }, [containerRef]);

  return size;
}

function GaugeCell({ children }: { children: ReactNode }) {
  return <div className="stats-gauge-cell">{children}</div>;
}

interface GaugeConfig {
  key: string;
  value: number;
  label: string;
  variant: CircularGaugeVariant;
  center: "percent" | "text";
  centerText?: string;
  goalMet?: boolean;
  over?: boolean;
  sublabel?: string;
}

export function StatsSidebar() {
  const gridRef = useRef<HTMLDivElement>(null);
  const gaugeSize = useSidebarGaugeSize(gridRef);
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const { t, locale } = useI18n();
  const numberLocale = bcp47Tag(locale);
  const { settings } = useBodyGoal();
  const { loading: trackerLoading, tasks, totalTasks } =
    useDailyTracker();
  const { totalMl, weekTotalMl, loading: hydrationLoading } = useHydration();

  // Mirror daily-tracker's effective completion: overlay actual water volume on top of task flags
  const { completion, completedCount } = useMemo(() => {
    const effectiveTasks = {
      ...tasks,
      hydration_1l: tasks.hydration_1l || totalMl >= HYDRATION_MILESTONE_ML.hydration_1l,
      hydration_2l: tasks.hydration_2l || totalMl >= HYDRATION_MILESTONE_ML.hydration_2l,
      hydration_3l: tasks.hydration_3l || totalMl >= HYDRATION_MILESTONE_ML.hydration_3l,
    };
    return {
      completion: calculateCompletion(effectiveTasks),
      completedCount: countCompletedTasks(effectiveTasks),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, totalMl]);
  const {
    status: calorieStatus,
    isFastingDay,
    loading: calorieLoading,
    macros,
    proteinGoalG,
    proteinMode,
  } = useCalories();
  const {
    today: activityToday,
    weekBurned,
    burnedTodayPercent,
    loading: activityLoading,
  } = useActivitySummary();

  const showSkeleton =
    trackerLoading || hydrationLoading || calorieLoading || activityLoading;

  const periodProgress = getGoalProgressPercent(settings);
  const weightProgress = getWeightProgressPercent(settings);
  const daysUntilGoal = getDaysUntilGoal(settings);

  const waterTodayPercent = hydrationProgressPercent(totalMl);
  const waterState = hydrationGaugeState(totalMl);
  const waterOverByMl = hydrationOverByMl(totalMl);
  const weekWaterPercent = Math.min(
    100,
    Math.round((weekTotalMl / HYDRATION_WEEK_GOAL_ML) * 100)
  );
  const weekLiters = mlToLiters(weekTotalMl, 1);

  const programGoalMet = isBodyGoalConfigured(settings) && weightProgress >= 100;
  const dailyGoalMet = completion >= 100;
  const daysLabel =
    daysUntilGoal != null ? formatDayCount(daysUntilGoal, locale, t) : "—";

  // Unified gauge config — used in both mobile strip and desktop card
  const planGauges: GaugeConfig[] = [
    {
      key: "period",
      value: periodProgress,
      label: t("stats.overallPlan"),
      variant: "violet",
      center: "percent",
      goalMet: programGoalMet,
      sublabel: isBodyGoalConfigured(settings)
        ? t("stats.weightDays", { pct: weightProgress, days: daysLabel })
        : t("stats.setGoal"),
    },
    {
      key: "today",
      value: completion,
      label: t("stats.todayDone"),
      variant:
        completion >= 80 ? "emerald" : completion >= 40 ? "gold" : "rose",
      center: "percent",
      goalMet: dailyGoalMet,
      sublabel: t("stats.tasks", { done: completedCount, total: totalTasks }),
    },
  ];

  // Weekly burn goal: daily calorie target × 7 × 25 % (reasonable activity target)
  const weeklyBurnGoal = Math.max(1750, Math.round((settings.dailyCalorieTarget ?? 2000) * 7 * 0.25));
  const weekBurnedPercent = burnedPercentOfTarget(weekBurned, weeklyBurnGoal);

  const protocolGauges: GaugeConfig[] = [
    // ── Row 1: today water · today calories ──
    {
      key: "water",
      value: waterTodayPercent,
      label: t("stats.water"),
      variant:
        waterState === "over"
          ? "fuchsia"
          : waterState === "met"
            ? "emerald"
            : "cyan",
      center: "text",
      centerText:
        waterState === "over"
          ? t("gauge.over")
          : waterState === "met"
            ? t("gauge.met")
            : `${waterTodayPercent}%`,
      over: waterState === "over",
      sublabel:
        waterState === "over"
          ? `+${mlToLiters(waterOverByMl, 1)} L · ${mlToLiters(totalMl, 1)}/${mlToLiters(HYDRATION_GOAL_ML, 1)} L`
          : `${mlToLiters(totalMl, 1)} / ${mlToLiters(HYDRATION_GOAL_ML, 1)} L`,
    },
    {
      key: "calories",
      value: isFastingDay
        ? calorieStatus.fastingValid
          ? 0
          : Math.min(100, calorieStatus.percentOfTarget)
        : Math.min(100, calorieStatus.percentOfTarget),
      label: t("stats.calories"),
      variant: isFastingDay
        ? calorieStatus.fastingValid
          ? "emerald"
          : "gold"
        : calorieStatus.inDeficit
          ? "emerald"
          : "rose",
      center: "text",
      centerText: isFastingDay
        ? calorieStatus.fastingValid
          ? t("common.fasting")
          : "!"
        : calorieStatus.inDeficit
          ? t("common.deficit")
          : t("gauge.over"),
      over: !isFastingDay && calorieStatus.overTarget,
      sublabel: isFastingDay
        ? `${calorieStatus.consumed}/${calorieStatus.target}`
        : calorieStatus.inDeficit
          ? `${calorieStatus.deficit} kcal · ${calorieStatus.consumed}/${calorieStatus.target}`
          : `+${calorieStatus.overBy} kcal · ${calorieStatus.consumed}/${calorieStatus.target}`,
    },
    // ── Row 2: burned today · protein ──
    {
      key: "burned",
      value: burnedTodayPercent,
      label: t("stats.burnedToday"),
      variant: "rose",
      center: "text",
      centerText: `${activityToday.totalBurned}`,
      sublabel: t("stats.stepsSport", {
        steps: activityToday.steps.toLocaleString(numberLocale),
        min: activityToday.trainingMinutes,
      }),
    },
    {
      key: "protein",
      value: Math.min(100, Math.round((macros.protein / proteinGoalG) * 100)),
      label: t("stats.protein"),
      variant: "gold",
      center: "text",
      centerText: `${Math.round(macros.protein)}g`,
      goalMet: macros.protein >= proteinGoalG,
      over: macros.protein > proteinGoalG * 1.1,
      sublabel: !getEffectiveWeightKg(settings)
        ? t("stats.proteinModeNoWeight")
        : t(
            proteinMode === "cutting"
              ? "stats.proteinModeCutting"
              : proteinMode === "building"
                ? "stats.proteinModeBuilding"
                : proteinMode === "maintenance"
                  ? "stats.proteinModeMaintenance"
                  : "stats.proteinModeNone",
            { ratio: PROTEIN_RATIO[proteinMode] }
          ),
    },
    // ── Row 3: water week · burned week (paired together) ──
    {
      key: "waterWeek",
      value: weekWaterPercent,
      label: t("stats.waterWeek"),
      variant: weekWaterPercent >= 100 ? "emerald" : "cyan",
      center: "text",
      centerText: `${weekLiters} L`,
      goalMet: weekWaterPercent >= 100,
      sublabel: `${weekLiters} / ${mlToLiters(HYDRATION_WEEK_GOAL_ML, 0)} L`,
    },
    {
      key: "weekBurned",
      value: weekBurnedPercent,
      label: t("stats.burnedWeek"),
      variant: weekBurnedPercent >= 100 ? "emerald" : "rose",
      center: "text",
      centerText: `${weekBurned}`,
      goalMet: weekBurnedPercent >= 100,
      sublabel: t("stats.burnedWeekSub", { goal: weeklyBurnGoal }),
    },
  ];

  return (
    <aside className="flex w-full min-w-0 flex-col gap-4">
      {/* ── MOBILE: collapsible gauge grid (hidden on lg+) ── */}
      <div className={cn("lg:hidden", showSkeleton && "opacity-60")}>
        {/* Toggle header — summary + chevron */}
        <button
          type="button"
          onClick={() => setMobileExpanded((v) => !v)}
          className="harvin-panel flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#c4b5fd]/90">
              {completion}%
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#7dd3fc]/90">
              {mlToLiters(totalMl, 1)} L
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#e8d5a3]/90">
              {calorieStatus.consumed} kcal
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#6ee7b7]/90">
              P {Math.round(macros.protein)}g
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
              mobileExpanded && "rotate-180"
            )}
          />
        </button>

        {/* Expandable gauge grid */}
        {mobileExpanded && (
          <div className="mt-3 flex flex-col gap-3">
            <section
              className="stats-gauges-section stats-gauges-section--plan"
              aria-label={t("stats.overallPlan")}
            >
              <div className="stats-gauges-grid">
                {planGauges.map((g) => (
                  <GaugeCell key={g.key}>
                    <CircularGauge
                      value={g.value}
                      label={g.label}
                      size={90}
                      variant={g.variant}
                      center={g.center}
                      centerText={g.centerText}
                      goalMet={g.goalMet}
                      over={g.over}
                      sublabel={g.sublabel}
                    />
                  </GaugeCell>
                ))}
              </div>
            </section>
            <section
              className="stats-gauges-section stats-gauges-section--protocols"
              aria-label={t("stats.protocolsToday")}
            >
              <div className="stats-gauges-grid">
                {protocolGauges.map((g) => (
                  <GaugeCell key={g.key}>
                    <CircularGauge
                      value={g.value}
                      label={g.label}
                      size={90}
                      variant={g.variant}
                      center={g.center}
                      centerText={g.centerText}
                      goalMet={g.goalMet}
                      over={g.over}
                      sublabel={g.sublabel}
                    />
                  </GaugeCell>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ── DESKTOP: card s dvoma sekciami (hidden below lg) ── */}
      <Card className="hidden min-w-0 overflow-hidden lg:block harvin-panel">
        <CardContent className="stats-gauges-panel p-0 sm:p-0">
          <div
            ref={gridRef}
            className={cn(
              "flex min-w-0 flex-col gap-4 transition-opacity sm:gap-5",
              showSkeleton ? "opacity-60" : "opacity-100"
            )}
          >
            <section
              className="stats-gauges-section stats-gauges-section--plan"
              aria-label={t("stats.overallPlan")}
            >
              <div className="stats-gauges-grid">
                {planGauges.map((g) => (
                  <GaugeCell key={g.key}>
                    <CircularGauge
                      value={g.value}
                      label={g.label}
                      size={gaugeSize}
                      variant={g.variant}
                      center={g.center}
                      centerText={g.centerText}
                      goalMet={g.goalMet}
                      over={g.over}
                      sublabel={g.sublabel}
                    />
                  </GaugeCell>
                ))}
              </div>
            </section>

            <section
              className="stats-gauges-section stats-gauges-section--protocols"
              aria-label={t("stats.protocolsToday")}
            >
              <div className="stats-gauges-grid">
                {protocolGauges.map((g) => (
                  <GaugeCell key={g.key}>
                    <CircularGauge
                      value={g.value}
                      label={g.label}
                      size={gaugeSize}
                      variant={g.variant}
                      center={g.center}
                      centerText={g.centerText}
                      goalMet={g.goalMet}
                      over={g.over}
                      sublabel={g.sublabel}
                    />
                  </GaugeCell>
                ))}
              </div>
            </section>
          </div>
          {showSkeleton && (
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              {t("common.sync")}
            </p>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
