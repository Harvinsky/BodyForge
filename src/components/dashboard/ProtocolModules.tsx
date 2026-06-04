"use client";

import { useState } from "react";
import { CalorieTracker } from "@/components/dashboard/CalorieTracker";
import { HydrationTracker } from "@/components/dashboard/HydrationTracker";
import { MealPlan } from "@/components/dashboard/MealPlan";
import { TrainingTracker } from "@/components/dashboard/TrainingTracker";
import { APP_NAME } from "@/lib/brand";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

type TabId = "meals" | "training" | "calories" | "water";

export function ProtocolModules() {
  const [active, setActive] = useState<TabId>("meals");
  const { t } = useI18n();

  const tabs: {
    id: TabId;
    label: string;
    shortLabel: string;
  }[] = [
    {
      id: "meals",
      label: t("modules.mealPlan"),
      shortLabel: t("modules.mealPlanShort"),
    },
    {
      id: "training",
      label: t("modules.training"),
      shortLabel: t("modules.trainingShort"),
    },
    {
      id: "calories",
      label: t("modules.calories"),
      shortLabel: t("modules.caloriesShort"),
    },
    {
      id: "water",
      label: t("modules.water"),
      shortLabel: t("modules.waterShort"),
    },
  ];

  return (
    <section
      className={cn(
        "harvin-panel min-w-0 overflow-hidden transition-all duration-500",
        active === "water" && "ring-1 ring-[#38bdf8]/30"
      )}
    >
      <div
        role="tablist"
        aria-label={t("modules.aria", { app: APP_NAME })}
        className="app-scroll-x flex snap-x snap-mandatory flex-nowrap gap-0 overflow-x-auto border-b border-primary/25 bg-background/40"
      >
        {tabs.map((tab) => {
          const selected = active === tab.id;
          const isWater = tab.id === "water";
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`protocol-panel-${tab.id}`}
              id={`protocol-tab-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={cn(
                "relative min-h-[44px] min-w-[88px] shrink-0 snap-start flex-1 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors sm:min-w-[120px] sm:px-4 sm:text-xs sm:tracking-[0.12em]",
                selected && !isWater && "bg-primary/15 text-[#e8d5a3]",
                selected && isWater && "bg-[#38bdf8]/15 text-[#7dd3fc]",
                !selected &&
                  "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {selected && (
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5",
                    isWater ? "bg-[#38bdf8]" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`protocol-panel-${active}`}
        aria-labelledby={`protocol-tab-${active}`}
        className="min-w-0 scroll-mt-24"
      >
        {active === "meals" && <MealPlan />}
        {active === "training" && <TrainingTracker embedded />}
        {active === "calories" && <CalorieTracker embedded />}
        {active === "water" && <HydrationTracker embedded />}
      </div>
    </section>
  );
}
