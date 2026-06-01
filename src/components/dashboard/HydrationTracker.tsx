"use client";

import { Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HydrationChart } from "@/components/dashboard/hydration-chart";
import { HydrationControls } from "@/components/dashboard/hydration-controls";
import { HydrationGauge } from "@/components/dashboard/hydration-gauge";
import { HydrationLogList } from "@/components/dashboard/hydration-log-list";
import { useHydration } from "@/hooks/use-hydration";
import { APP_MODULE_PREFIX } from "@/lib/brand";
import {
  HYDRATION_GOAL_ML,
  hydrationProgressPercent,
  mlToLiters,
  needsDeadlinePush,
  remainingMl,
} from "@/lib/hydration";
import {
  HYDRATION_PROTOCOL_GOAL,
  HYDRATION_PROTOCOL_HEADLINE,
  HYDRATION_PROTOCOL_TITLE,
  HYDRATION_RULES,
} from "@/lib/hydration-protocol";
import { cn } from "@/lib/utils";

export function HydrationTracker({ embedded = false }: { embedded?: boolean }) {
  const {
    logs,
    totalMl,
    chartData,
    optimized,
    loading,
    saving,
    addWater,
    removeWater,
  } = useHydration();

  const percent = hydrationProgressPercent(totalMl);
  const remaining = remainingMl(totalMl);
  const deadlineHint = needsDeadlinePush(totalMl);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-500",
        embedded ? "border-0 bg-transparent shadow-none" : "harvin-panel",
        optimized &&
          "ring-2 shadow-[0_0_40px_rgba(56,189,248,0.2)] ring-[#38bdf8]/50"
      )}
    >
      {optimized && (
        <div className="border-b border-[#34d399]/40 bg-[#34d399]/10 px-4 py-3 text-center">
          <p className="animate-pulse font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#6ee7b7]">
            System Optimized
          </p>
        </div>
      )}

      <CardHeader className="border-b border-[#38bdf8]/20 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#38bdf8]/50 bg-[#38bdf8]/10">
              <Droplets className="h-5 w-5 text-[#38bdf8]" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                {APP_MODULE_PREFIX} · Voda
              </p>
              <CardTitle className="mt-1 font-mono text-base uppercase tracking-widest text-[#e8d5a3]">
                {HYDRATION_PROTOCOL_TITLE}
              </CardTitle>
              <p className="mt-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#38bdf8]">
                {HYDRATION_PROTOCOL_HEADLINE}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {HYDRATION_PROTOCOL_GOAL}
              </p>
            </div>
          </div>

          {!loading && (
            <HydrationGauge
              percent={percent}
              liters={mlToLiters(totalMl, 1)}
              optimized={optimized}
            />
          )}
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {HYDRATION_RULES.map((rule) => (
            <li
              key={rule.title}
              className="border border-[#38bdf8]/15 bg-background/40 px-3 py-2"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#38bdf8]">
                {rule.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {rule.body}
              </p>
            </li>
          ))}
        </ul>

        {deadlineHint && !optimized && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-amber-400/90">
            Do 18:00 cieľ 3,2 L (80 %) — ešte chýba {mlToLiters(remaining)} L
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6 p-4 sm:p-6">
        <HydrationControls
          onAdd={addWater}
          disabled={saving || loading}
        />

        <div className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-widest">
          <span className="text-[#38bdf8]">
            Celkom: {mlToLiters(totalMl)} / {mlToLiters(HYDRATION_GOAL_ML, 1)} L
          </span>
          {!optimized && (
            <span className="text-muted-foreground">
              Zostáva: {mlToLiters(remaining)} L
            </span>
          )}
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Spotreba dnes (reálny čas)
          </p>
          <HydrationChart chartData={chartData} loading={loading} />
        </div>

        <HydrationLogList
          logs={logs}
          onRemove={(id) => void removeWater(id)}
          disabled={saving || loading}
        />
      </CardContent>
    </Card>
  );
}
