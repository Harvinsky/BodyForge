"use client";

import { cn } from "@/lib/utils";

const VARIANT_STROKE = {
  gold: "#c9a227",
  cyan: "#38bdf8",
  emerald: "#34d399",
  violet: "#a78bfa",
  rose: "#fb7185",
  fuchsia: "#c084fc",
} as const;

const VARIANT_TEXT = {
  gold: "text-[#e8d5a3]",
  cyan: "text-[#7dd3fc]",
  emerald: "text-[#6ee7b7]",
  violet: "text-[#c4b5fd]",
  rose: "text-[#fda4af]",
  fuchsia: "text-[#e9d5ff]",
} as const;

const OVER_GLOW: Partial<Record<keyof typeof VARIANT_STROKE, string>> = {
  rose: "drop-shadow-[0_0_22px_rgba(251,113,133,0.55)]",
  fuchsia: "drop-shadow-[0_0_22px_rgba(192,132,252,0.55)]",
  gold: "drop-shadow-[0_0_22px_rgba(201,162,39,0.45)]",
  cyan: "drop-shadow-[0_0_18px_rgba(56,189,248,0.35)]",
};

const GOAL_GLOW: Partial<Record<keyof typeof VARIANT_STROKE, string>> = {
  violet: "drop-shadow-[0_0_26px_rgba(167,139,250,0.7)]",
  emerald: "drop-shadow-[0_0_26px_rgba(52,211,153,0.7)]",
  gold: "drop-shadow-[0_0_24px_rgba(201,162,39,0.55)]",
};

export type CircularGaugeVariant = keyof typeof VARIANT_STROKE;

interface CircularGaugeProps {
  value: number;
  label: string;
  size?: number;
  variant?: CircularGaugeVariant;
  center?: "percent" | "text";
  centerText?: string;
  sublabel?: string;
  /** Výraznejší vizuál pri prekročení limitu */
  over?: boolean;
  /** Glow keď je cieľ splnený (100 % / váha) */
  goalMet?: boolean;
  className?: string;
  /** Voliteľný override štýlu pre label (napr. kompaktný strip) */
  labelClassName?: string;
}

export function CircularGauge({
  value,
  label,
  size = 130,
  variant = "gold",
  center = "percent",
  centerText,
  sublabel,
  over = false,
  goalMet = false,
  className,
  labelClassName,
}: CircularGaugeProps) {
  const stroke = 7;
  const radius = (size - stroke * 2) / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;
  const accent = VARIANT_STROKE[variant];
  const overGlow = over ? OVER_GLOW[variant] : undefined;
  const goalGlow = goalMet && !over ? GOAL_GLOW[variant] : undefined;
  const centerLabel = centerText ?? "—";
  const longCenterText =
    center === "text" && centerLabel.length > 6;
  const compactCenterText = center === "text" && size <= 112 && longCenterText;

  return (
    <div className={cn("flex w-full min-w-0 flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "relative mx-auto shrink-0 transition-all duration-500",
          overGlow,
          goalGlow,
          goalMet && !over && "scale-[1.03]"
        )}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full -rotate-90"
          aria-hidden
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={over ? "#3f3f3f" : "#2a2a2a"}
            strokeWidth={stroke}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={over ? stroke + 1 : stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center font-semibold tabular-nums",
            center === "text"
              ? compactCenterText
                ? "px-1"
                : size <= 112
                  ? "px-1 text-xs sm:text-sm"
                  : "px-1.5 text-sm sm:text-base"
              : "text-xl sm:text-2xl",
            VARIANT_TEXT[variant],
            over && center !== "text" && "scale-105"
          )}
        >
          {center === "text" ? (
            <span
              className={cn(
                "max-w-[88%] text-center font-semibold leading-[1.1] tracking-tight",
                compactCenterText
                  ? "text-[9px] whitespace-normal break-words sm:text-[10px]"
                  : "whitespace-nowrap"
              )}
            >
              {centerLabel}
            </span>
          ) : (
            <>{Math.round(clamped)}%</>
          )}
        </span>
      </div>
      <p className={
        labelClassName ??
        "harvin-panel-title mt-0.5 max-w-full px-1 text-center text-[0.6rem] leading-snug tracking-[0.12em]"
      }>
        {label}
      </p>
      <p
        className={cn(
          "max-w-full px-1 text-center font-mono text-[8px] leading-snug tracking-wide sm:px-0.5 sm:text-[9px]",
          sublabel ? (over ? "text-[#fda4af]" : "text-muted-foreground") : "invisible pointer-events-none select-none"
        )}
      >
        {sublabel ?? "\u00a0"}
      </p>
    </div>
  );
}
