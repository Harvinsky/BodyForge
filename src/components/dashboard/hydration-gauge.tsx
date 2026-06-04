"use client";

import { Gauge } from "lucide-react";
import {
  HYDRATION_GOAL_ML,
  hydrationAccentForState,
  hydrationGaugeState,
  hydrationOverByMl,
  mlToLiters,
  type HydrationGaugeState,
} from "@/lib/hydration";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

interface HydrationGaugeProps {
  totalMl: number;
  size?: number;
  compact?: boolean;
}

const STATE_GLOW: Record<HydrationGaugeState, string | undefined> = {
  under: undefined,
  met: "drop-shadow-[0_0_24px_rgba(52,211,153,0.45)]",
  over: "drop-shadow-[0_0_26px_rgba(192,132,252,0.55)]",
};

export function HydrationGauge({
  totalMl,
  size = 160,
  compact = false,
}: HydrationGaugeProps) {
  const { t } = useI18n();
  const state = hydrationGaugeState(totalMl);
  const percent = Math.min(100, Math.round((totalMl / HYDRATION_GOAL_ML) * 100));
  const overByMl = hydrationOverByMl(totalMl);
  const accent = hydrationAccentForState(state);
  const stroke = compact ? 8 : 10;
  const radius = (size - stroke * 2) / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={cn("relative transition-all duration-500", STATE_GLOW[state])}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={radius + 6}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={2}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={state === "over" ? "#3f3f3f" : "#252525"}
            strokeWidth={stroke}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={state === "over" ? stroke + 1 : stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
          {[0, 25, 50, 75].map((tick) => {
            const angle = (tick / 100) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = cx + (radius - 4) * Math.cos(rad);
            const y1 = cy + (radius - 4) * Math.sin(rad);
            const x2 = cx + (radius + 2) * Math.cos(rad);
            const y2 = cy + (radius + 2) * Math.sin(rad);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#404040"
                strokeWidth={1}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Gauge
            className={cn("mb-1", compact ? "h-3 w-3" : "h-4 w-4")}
            style={{ color: accent }}
            aria-hidden
          />
          <span
            className={cn(
              "font-bold tabular-nums",
              compact ? "font-mono text-2xl" : "font-mono text-3xl",
              state === "over" && "scale-105"
            )}
            style={{ color: accent }}
          >
            {mlToLiters(totalMl, 1)}L
          </span>
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-widest",
              state === "over" ? "text-[#e9d5ff]" : "text-muted-foreground"
            )}
          >
            {state === "over"
              ? `+${mlToLiters(overByMl, 1)}L · / ${mlToLiters(HYDRATION_GOAL_ML, 1)}L`
              : `/ ${mlToLiters(HYDRATION_GOAL_ML, 1)}L`}
          </span>
        </div>
      </div>
      {!compact && (
        <p
          className={cn(
            "mt-2 font-mono text-xs uppercase tracking-widest",
            state === "over"
              ? "text-[#e9d5ff]"
              : state === "met"
                ? "text-[#6ee7b7]"
                : "text-muted-foreground"
          )}
        >
          {state === "over"
            ? t("hydration.gaugeOver", { percent })
            : state === "met"
              ? t("hydration.gaugeMet", { percent })
              : t("hydration.gaugeUnder", { percent })}
        </p>
      )}
    </div>
  );
}
