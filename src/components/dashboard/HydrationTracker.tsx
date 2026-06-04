"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HydrationChart } from "@/components/dashboard/hydration-chart";
import { HydrationControls } from "@/components/dashboard/hydration-controls";
import { HydrationGauge } from "@/components/dashboard/hydration-gauge";
import { HydrationLogList } from "@/components/dashboard/hydration-log-list";
import { useHydration } from "@/hooks/use-hydration";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { APP_MODULE_PREFIX } from "@/lib/brand";
import {
  hydrationGaugeState,
  hydrationOverByMl,
  mlToLiters,
  needsDeadlinePush,
  remainingMl,
} from "@/lib/hydration";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

export function HydrationTracker({ embedded = false }: { embedded?: boolean }) {
  const {
    logs,
    totalMl,
    goalMl,
    chartData,
    optimized,
    loading,
    saving,
    addWater,
    removeWater,
    lastError,
  } = useHydration();
  const { settings, updateSettings, saving: goalSaving } = useBodyGoal();
  const { t } = useI18n();

  const [goalInput, setGoalInput] = useState("");
  const [goalEditOpen, setGoalEditOpen] = useState(false);

  const waterState = hydrationGaugeState(totalMl, goalMl);
  const overByMl = hydrationOverByMl(totalMl, goalMl);
  const remaining = remainingMl(totalMl, goalMl);
  const deadlineHint = needsDeadlinePush(totalMl, undefined, goalMl);

  const handleGoalSave = async () => {
    const val = parseFloat(goalInput.replace(",", "."));
    if (!isNaN(val) && val >= 1 && val <= 10) {
      await updateSettings({ hydrationTargetLiters: val });
      setGoalEditOpen(false);
      setGoalInput("");
    }
  };

  const rules = [
    { title: t("hydration.ruleMicroTitle"), body: t("hydration.ruleMicroBody") },
    {
      title: t("hydration.ruleDeadlineTitle"),
      body: t("hydration.ruleDeadlineBody"),
    },
    { title: t("hydration.ruleVizTitle"), body: t("hydration.ruleVizBody") },
  ];

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-500",
        embedded ? "border-0 bg-transparent shadow-none" : "harvin-panel",
        waterState === "met" &&
          "ring-2 shadow-[0_0_40px_rgba(52,211,153,0.2)] ring-[#34d399]/50",
        waterState === "over" &&
          "ring-2 shadow-[0_0_40px_rgba(192,132,252,0.25)] ring-[#c084fc]/50"
      )}
    >
      {waterState === "met" && (
        <div className="border-b border-[#34d399]/40 bg-[#34d399]/10 px-4 py-3 text-center">
          <p className="animate-pulse font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#6ee7b7]">
            {t("hydration.optimized")}
          </p>
        </div>
      )}
      {waterState === "over" && (
        <div className="border-b border-[#c084fc]/40 bg-[#c084fc]/10 px-4 py-3 text-center">
          <p className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#e9d5ff]">
            {t("hydration.overGoal", { liters: mlToLiters(overByMl, 1) })}
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
                {APP_MODULE_PREFIX} · {t("hydration.modulePrefix")}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <CardTitle className="font-mono text-base uppercase tracking-widest text-[#e8d5a3]">
                  {t("hydration.title")}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    setGoalEditOpen((v) => !v);
                    setGoalInput(String((settings.hydrationTargetLiters ?? 3.5).toFixed(1)));
                  }}
                  className="font-mono text-[10px] text-[#38bdf8]/70 underline decoration-dotted hover:text-[#38bdf8]"
                  title={t("hydration.changeGoal")}
                >
                  {t("hydration.targetLabel", { liters: mlToLiters(goalMl, 1) })}
                </button>
              </div>
              {goalEditOpen && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleGoalSave(); }}
                    className="w-20 border border-[#38bdf8]/40 bg-background px-2 py-1 font-mono text-xs text-foreground"
                    placeholder="3.5"
                  />
                  <span className="font-mono text-xs text-muted-foreground">L</span>
                  <button
                    type="button"
                    onClick={() => void handleGoalSave()}
                    disabled={goalSaving}
                    className="border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#38bdf8] hover:bg-[#38bdf8]/20 disabled:opacity-50"
                  >
                    {t("common.save")}
                  </button>
                </div>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-[#38bdf8]">
                  {t("hydration.aboutProtocol")}
                </summary>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {t("hydration.headline")} — {t("hydration.goal")}
                </p>
              </details>
            </div>
          </div>

          {!loading && <HydrationGauge totalMl={totalMl} />}
        </div>

        <details className="group mt-4">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("hydration.showRules")}
          </summary>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3">
            {rules.map((rule) => (
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
        </details>

        {deadlineHint && waterState === "under" && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-amber-400/90">
            {t("hydration.deadlineHint", {
              liters: mlToLiters(remaining),
            })}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6 p-4 sm:p-6">
        <HydrationControls
          onAdd={addWater}
          disabled={saving || loading}
          error={lastError}
        />

        <div className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-widest">
          <span className="text-[#38bdf8]">
            {t("hydration.total", {
              current: mlToLiters(totalMl),
              goal: mlToLiters(goalMl, 1),
            })}
          </span>
          {!optimized && waterState === "under" && (
            <span className="text-muted-foreground">
              {t("hydration.remaining", { liters: mlToLiters(remaining) })}
            </span>
          )}
          {waterState === "over" && (
            <span className="text-[#e9d5ff]">
              {t("hydration.overBy", { liters: mlToLiters(overByMl, 1) })}
            </span>
          )}
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("hydration.chartTitle")}
          </p>
          <HydrationChart chartData={chartData} loading={loading} />
        </div>

        {logs.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground">{t("hydration.emptyHint")}</p>
        )}

        <HydrationLogList
          logs={logs}
          onRemove={(id) => void removeWater(id)}
          disabled={saving || loading}
        />
      </CardContent>
    </Card>
  );
}
