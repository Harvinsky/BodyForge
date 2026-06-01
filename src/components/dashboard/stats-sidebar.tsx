"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { CircularGauge } from "@/components/dashboard/circular-gauge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { useCalories } from "@/hooks/use-calories";
import { useHydration } from "@/hooks/use-hydration";
import { useNotifications } from "@/providers/notification-provider";
import { isHabitDone } from "@/lib/habits";
import {
  HYDRATION_GOAL_ML,
  HYDRATION_WEEK_GOAL_ML,
  hydrationProgressPercent,
  mlToLiters,
} from "@/lib/hydration";
import { getPlanPace } from "@/lib/goal";

const GAUGE_SIZE = 108;

export function StatsSidebar() {
  const { settings } = useBodyGoal();
  const { progressHistory, tasks, loading: trackerLoading } = useDailyTracker();
  const { totalMl, weekTotalMl, optimized, loading: hydrationLoading } =
    useHydration();
  const {
    status: calorieStatus,
    isFastingDay,
    loading: calorieLoading,
  } = useCalories();
  const {
    enabled,
    permission,
    supported,
    todayPlan,
    isNative,
    enableNotifications,
    disableNotifications,
  } = useNotifications();

  const showSkeleton =
    trackerLoading || hydrationLoading || calorieLoading;

  const protocolAverage =
    progressHistory.length > 0
      ? Math.round(
          progressHistory.reduce((s, d) => s + d.completion, 0) /
            progressHistory.length
        )
      : 0;

  const planPace = getPlanPace(settings, protocolAverage);

  const waterTodayPercent = hydrationProgressPercent(totalMl);
  const vacuumPercent = isHabitDone(tasks, "vacuum") ? 100 : 0;
  const weekWaterPercent = Math.min(
    100,
    Math.round((weekTotalMl / HYDRATION_WEEK_GOAL_ML) * 100)
  );
  const weekLiters = mlToLiters(weekTotalMl, 1);

  return (
    <aside className="flex flex-col gap-4">
      <Card className="harvin-panel">
        <CardContent className="p-4 sm:p-5">
          <div
            className={`flex flex-col gap-5 transition-opacity ${showSkeleton ? "opacity-60" : "opacity-100"}`}
          >
              <CircularGauge
                value={planPace.pacePercent}
                label="Tempo plánu"
                size={120}
                variant={planPace.status === "ahead" ? "emerald" : "gold"}
                center="text"
                centerText={planPace.statusLabel}
                sublabel={`Plnenie ${planPace.actualPercent}% · ${planPace.sublabel}`}
              />

              <div className="border-t border-primary/20 pt-4">
                <p className="mb-3 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                  Protokoly dnes
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-5">
                  <CircularGauge
                    value={waterTodayPercent}
                    label="Voda"
                    size={GAUGE_SIZE}
                    variant={optimized ? "emerald" : "cyan"}
                    sublabel={`${mlToLiters(totalMl, 1)} / ${mlToLiters(HYDRATION_GOAL_ML, 1)} L`}
                  />
                  <CircularGauge
                    value={
                      isFastingDay
                        ? calorieStatus.fastingValid
                          ? 0
                          : Math.min(100, calorieStatus.percentOfTarget)
                        : Math.min(100, calorieStatus.percentOfTarget)
                    }
                    label="Kalórie"
                    size={GAUGE_SIZE}
                    variant={
                      isFastingDay
                        ? calorieStatus.fastingValid
                          ? "emerald"
                          : "gold"
                        : calorieStatus.inDeficit
                          ? "emerald"
                          : "gold"
                    }
                    center="text"
                    centerText={
                      isFastingDay
                        ? calorieStatus.fastingValid
                          ? "Fasting"
                          : "!"
                        : calorieStatus.inDeficit
                          ? "Deficit"
                          : "Prek."
                    }
                    sublabel={`${calorieStatus.consumed}/${calorieStatus.target}`}
                  />
                  <CircularGauge
                    value={vacuumPercent}
                    label="Vákuum"
                    size={GAUGE_SIZE}
                    variant="gold"
                    sublabel={vacuumPercent ? "Splnené" : "Čaká"}
                  />
                  <CircularGauge
                    value={weekWaterPercent}
                    label="Voda týždeň"
                    size={GAUGE_SIZE}
                    variant="cyan"
                    center="text"
                    centerText={`${weekLiters} L`}
                    sublabel="posledných 7 dní"
                  />
                </div>
              </div>
            </div>
          {showSkeleton && (
            <p className="text-center text-[10px] text-muted-foreground">
              Sync…
            </p>
          )}
        </CardContent>
      </Card>

      {supported && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {enabled && permission === "granted" ? (
                  <BellRing className="h-4 w-4 text-primary" />
                ) : permission === "denied" ? (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Bell className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="notify" className="text-xs uppercase tracking-wide">
                  Pripomienky
                </Label>
              </div>
              <Switch
                id="notify"
                checked={enabled && permission === "granted"}
                disabled={permission === "denied"}
                onCheckedChange={(c) =>
                  c ? enableNotifications() : disableNotifications()
                }
              />
            </div>
            {permission !== "granted" && permission !== "denied" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full border-primary/40 text-xs"
                onClick={enableNotifications}
              >
                Povoliť notifikácie
              </Button>
            )}
            <div className="mt-3 max-h-32 space-y-1 overflow-y-auto border-t border-primary/15 pt-2">
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Dnešný plán
              </p>
              {todayPlan.slice(0, 8).map((item) => (
                <p key={item.id} className="text-[10px] leading-snug text-muted-foreground">
                  <span className="font-mono text-primary">{item.time}</span>{" "}
                  {item.title.replace(/^BodyForge · /, "")}
                </p>
              ))}
              {todayPlan.length > 8 && (
                <p className="text-[10px] text-muted-foreground">
                  +{todayPlan.length - 8} ďalších…
                </p>
              )}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {isNative
                ? "Natívna appka — systémové notifikácie aj na pozadí."
                : "Web — stránka musí bežať. V appke z telefónu ide to lepšie."}
            </p>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
