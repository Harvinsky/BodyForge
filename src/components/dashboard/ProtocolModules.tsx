"use client";

import { useState } from "react";
import { CalorieTracker } from "@/components/dashboard/CalorieTracker";
import { HydrationTracker } from "@/components/dashboard/HydrationTracker";
import { MealPlan } from "@/components/dashboard/MealPlan";
import { VacuumTimer } from "@/components/dashboard/VacuumTimer";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "meals", label: "JEDÁLNY LÍSTOK" },
  { id: "calories", label: "KALÓRIE" },
  { id: "water", label: "VODA" },
  { id: "vacuum", label: "VÁKUUM" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ProtocolModules() {
  const [active, setActive] = useState<TabId>("meals");

  return (
    <section
      className={cn(
        "harvin-panel overflow-hidden transition-all duration-500",
        active === "water" && "ring-1 ring-[#38bdf8]/30"
      )}
    >
      <div
        role="tablist"
        aria-label={`${APP_NAME} protokoly`}
        className="flex flex-nowrap overflow-x-auto border-b border-primary/25 bg-background/40 scrollbar-thin"
      >
        {TABS.map((tab) => {
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
                "relative min-w-[120px] flex-1 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors sm:min-w-[140px] sm:px-4 sm:text-xs",
                selected && !isWater && "bg-primary/15 text-[#e8d5a3]",
                selected && isWater && "bg-[#38bdf8]/15 text-[#7dd3fc]",
                !selected &&
                  "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              {tab.label}
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
        className="scroll-mt-24"
      >
        {active === "meals" && <MealPlan />}
        {active === "calories" && <CalorieTracker embedded />}
        {active === "water" && <HydrationTracker embedded />}
        {active === "vacuum" && <VacuumTimer embedded />}
      </div>
    </section>
  );
}
